// indexDB stuff 
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB ||
  window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
  window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange ||
  window.webkitIDBKeyRange || window.msIDBKeyRange

if (!window.indexedDB) {console.log(`Your browser doesn't support IndexDB`);}

const testSampleCount = 2;
const minSampleReq = 4;

const dbName = 'stylepass';
const dbSigs = 'sigKeys';
const dbMaster = 'masterKeys';

const enc = new TextEncoder();
const dec = new TextDecoder();

const buff_to_base64 = (buff) => btoa(String.fromCharCode.apply(null, buff));
const base64_to_buf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(null));

var threshold = 0.97;
var buffer = [];
var sessionSamples = [];
var sessionLabels = [];
var recording = false;
var phrase = null;

function getPrefix() {
    var prefix = null;
    if (window.performance !== undefined) {
        if (window.performance.now !== undefined)
            prefix = '';
        else {
            var browserPrefixes = ["webkit", "moz", "ms", "o"];
            // Test all vendor prefixes
            for (var i = 0; i < browserPrefixes.length; i++) {
                if (window.performance[browserPrefixes[i] + "Now"] != undefined) {
                    prefix = browserPrefixes[i];
                    break;
                }
            }
        }
    }
    return prefix;
}

function getTime() {
    return (prefix === '') ? window.performance.now() : window.performance[prefix + "Now"]();
}

function calculateMedian(values) {

    values.sort(function (a, b) { return a - b; });
    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];
    else
        return (values[half - 1] + values[half]) / 2.0;
}

function kernelDensityEstimator(kernel, X) {
    return function (V) {
        return X.map(function (x) {
            return [x, d3.mean(V, function (v) { return kernel(x - v); })];
        });
    };
}

function kernelEpanechnikov(k) {
    return function (v) {
        return Math.abs(v /= k) <= 1 ? 0.0199 * (1 - v * v) / k : 0;
    };
}

function dotp(x, y) {
    function dotp_sum(a, b) {
        return a + b;
    }
    function dotp_times(a, i) {
        return x[i] * y[i];
    }
    return x.map(dotp_times).reduce(dotp_sum, 0);
}

function cosineSimilarity(A, B) {
    var similarity = dotp(A, B) / (Math.sqrt(dotp(A, A)) * Math.sqrt(dotp(B, B)));
    return similarity;
}

function setThreshold(diff) {
    console.log('New difficulty: ' + diff)
    switch (diff) {
      case '0':
        threshold = 0.90;
        break;
      case '1':
        threshold = 0.95;
        break;
      case '2':
        threshold = 0.97;
        break;
      default:
        threshold = 0.97;
        break;
    }
}

async function hash256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
}

function extractOneFeature() {
    var uppArr = [];
    var downArr = [];
    var holdKeyTime = [];
    var ddKeyTime = [];
    var udKeyTime = [];
  
    for (var i = 0; i < buffer.length; i++) {
      if (buffer[i].event == "up") {
        uppArr.push(buffer[i]);
      }
      if (buffer[i].event == "down") {
        downArr.push(buffer[i]);
      }
    }
  
    if (uppArr.length != downArr.length || uppArr.length == 0 || downArr.length == 0) {
        console.error("Buffer can't be empty");
        return [];
    }
  
    for (var i = 0; i < downArr.length; i++) {
      var timed = uppArr[i].time - downArr[i].time;
      holdKeyTime.push({ key: 'H.' + uppArr[i].key, time: timed });
      if (i == downArr.length - 1) break;
      var pkey = ('DD.' + downArr[i].key + '.' + downArr[i + 1].key);
      ddKeyTime.push({ key: pkey, time: downArr[i + 1].time - downArr[i].time });
      var skey = 'UD.' + uppArr[i].key + '.' + downArr[i + 1].key;
      udKeyTime.push({ key: skey, time: downArr[i + 1].time - uppArr[i].time });
    }
  
    var featureReady = [];
    var labels = []
  
    for (var i = 0; i < holdKeyTime.length; i++) {
  
      if (i == holdKeyTime.length - 1) {
        labels.push(holdKeyTime[i].key);
        featureReady.push(holdKeyTime[i].time / 1000);
        break;
      }
      labels.push(holdKeyTime[i].key);
      labels.push(ddKeyTime[i].key);
      labels.push(udKeyTime[i].key);
  
      var hk_ = holdKeyTime[i].time / 1000;
      var ddk_ = ddKeyTime[i].time / 1000;
      var udk_ = udKeyTime[i].time / 1000;
  
      var hk = hk_ < 0 ? (hk_ * -1) : hk_;
      var ddk = ddk_ < 0 ? (ddk_ * -1) : ddk_;
      var udk = udk_ < 0 ? (udk_ * -1) : udk_;
  
      featureReady.push(hk);
      featureReady.push(ddk);
      featureReady.push(udk);
    }
    return featureReady;
}

function extractFeatures() {
    var uppArr = [];
    var downArr = [];
    var holdKeyTime = [];
    var ddKeyTime = [];
    var udKeyTime = [];
  
    for (var i = 0; i < buffer.length; i++) {
      if (buffer[i].event == "up") {
        uppArr.push(buffer[i]);
      }
      if (buffer[i].event == "down") {
        downArr.push(buffer[i]);
      }
    }
  
    if (uppArr.length != downArr.length || uppArr.length == 0 || downArr.length == 0) {
      console.error("Buffer can't be empty");

      return [];
    }
  
    for (var i = 0; i < downArr.length; i++) {
      var timed = uppArr[i].time - downArr[i].time;
      holdKeyTime.push({ key: 'H.' + uppArr[i].key, time: timed });
      if (i == downArr.length - 1) break;
      var pkey = ('DD.' + downArr[i].key + '.' + downArr[i + 1].key);
      ddKeyTime.push({ key: pkey, time: downArr[i + 1].time - downArr[i].time });
      var skey = 'UD.' + uppArr[i].key + '.' + downArr[i + 1].key;
      udKeyTime.push({ key: skey, time: downArr[i + 1].time - uppArr[i].time });
    }
  
    var featureReady = [];
    var labels = []
    for (var i = 0; i < holdKeyTime.length; i++) {
      var totalTime = buffer[buffer.length - 1].time - buffer[0].time;
  
      if (i == holdKeyTime.length - 1) {
        labels.push(holdKeyTime[i].key);
        featureReady.push(holdKeyTime[i].time / 1000);
        break;
      }
      labels.push(holdKeyTime[i].key);
      labels.push(ddKeyTime[i].key);
      labels.push(udKeyTime[i].key);
  
      var hk_ = holdKeyTime[i].time / 1000;
      var ddk_ = ddKeyTime[i].time / 1000;
      var udk_ = udKeyTime[i].time / 1000;
  
      var hk = hk_ < 0 ? (hk_ * -1) : hk_;
      var ddk = ddk_ < 0 ? (ddk_ * -1) : ddk_;
      var udk = udk_ < 0 ? (udk_ * -1) : udk_;
  
      featureReady.push(hk);
      featureReady.push(ddk);
      featureReady.push(udk);
    }
    return {featureReady, labels};
}

function getAccuracy(sessionSamples){
    var testSamples = sessionSamples.slice(Math.max(sessionSamples.length - testSampleCount, 0));
    var testResult = [];
  
    for (var i = 0; i < testSamples.length; i++) {
      var allSimilarities = [];
      for (var m = 0; m < sessionSamples.length; m++) {
        var pred = cosineSimilarity(sessionSamples[m], testSamples[i]);
        allSimilarities.push(pred);
      }
  
      var med = calculateMedian(allSimilarities);
      var res = med > threshold ? 0 : 1;
      testResult.push(res);
    }
  
    var wins = 0;
    for (var n = 0; n < testResult.length; n++) {
      if (testResult[n] == 0) {
        wins++;
      }
    }
    return (wins / testResult.length);
}

function isReady(){
  return localStorage.getItem('is_db_created') === 'true';
}

function loadFromIndexedDB(storeName, id) {
  return new Promise(
    function (resolve, reject) {

      var request = window.indexedDB.open(dbName);

      request.onerror = function(event) {
        console.error(`Database error: ${event.target.errorCode}`);
      };

      request.onsuccess = function(event) {
        var database = event.target.result;
        const transaction = database.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const objectRequest = objectStore.get(id);
  
        objectRequest.onerror = function (event) {
          reject(new Error('Unable to retrieve data from database'));
        };
  
        objectRequest.onsuccess = function (event) {
          resolve(objectRequest.result);
        };

        objectRequest.oncomplete = function () {
          database.close();
        };
      }
  });
}
  
function saveToIndexedDB(storeName, object) {
  return new Promise(
    function (resolve, reject) {

    var request = window.indexedDB.open(dbName);

    request.onerror = function(event) {
      console.error(`Database error: ${event.target.errorCode}`);
    };

    request.onupgradeneeded = function (event) {
      var database = event.target.result;
      var createMasterStore = database.createObjectStore(dbMaster, { autoIncrement: true });
      createMasterStore.createIndex('id', 'id', { unique: true });
      var createSigStore = database.createObjectStore(dbSigs, { autoIncrement: true });
    };

    request.onsuccess = function(event) {
      var database = event.target.result;
      var transaction  = database.transaction([storeName], 'readwrite')
      .objectStore(storeName)
      .put(object); // Overwrite if exists
  
      transaction.onerror = function (event) {
        console.error('Request error');
        reject(false);
      };
  
      transaction.onsuccess = function (event) {
        console.log('Data saved');
        resolve(true);
      };

      transaction.oncomplete = function () {
        database.close();
      };
    };
  });
}

const getPasswordKey = (password) =>
  window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
]);

const deriveKey = (passwordKey, salt, keyUsage) =>
  window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
);

async function encryptData(secretData, password) {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      enc.encode(secretData)
    );

    const encryptedContentArr = new Uint8Array(encryptedContent);
    let buff = new Uint8Array(
      salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
    );
    buff.set(salt, 0);
    buff.set(iv, salt.byteLength);
    buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
    const base64Buff = buff_to_base64(buff);
    return base64Buff;
  } catch (e) {
    console.log(`Error - ${e}`);
    return "";
  }
}

async function decryptData(encryptedData, password) {  
  try {
    const encryptedDataBuff = base64_to_buf(encryptedData);
    const salt = encryptedDataBuff.slice(0, 16);
    const iv = encryptedDataBuff.slice(16, 16 + 12);
    const data = encryptedDataBuff.slice(16 + 12);
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      data
    );
    return dec.decode(decryptedContent);
  } catch (e) {
    console.log(`Error - ${e}`);
    return "";
  }
}

async function saveSignature(signiture){
  const cipher = await encryptData(signiture, theKey);
  await saveToIndexedDB(dbSigs, cipher);
}

async function getAllSignatures(){
  return new Promise(
    function (resolve, reject) {
    var allSigs = [];

    var request = window.indexedDB.open(dbName);

    request.onerror = function(event) {
      console.error(`Database error: ${event.target.errorCode}`);
    };

    request.onsuccess = function(event) {
      var database = event.target.result;
      var transaction = database.transaction(dbSigs, 'readonly');
      var objectRequest = transaction.objectStore(dbSigs);
                
      objectRequest.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            allSigs.push(cursor.value);
            cursor.continue();
        }
      };
  
      transaction.oncomplete = function () {
        resolve(allSigs);
        database.close();
        
      };
    }
  });
}

async function loadAllSignatures(arr,key){
  var decrypted = [];
  for(i=0; i < arr.length; i++){
    var dec = await decryptData(arr[i], key);
    var el = dec.split(",").map(Number);
    decrypted.push(el);
  }
  return decrypted;
}

async function createMasterKey(key, phrase) {
  const sha256 = await hash256(key);
  const kobject = { 'key': sha256, 'phrase': phrase };
  var isSaved = await saveToIndexedDB(dbMaster, kobject);
  if(isSaved === true){
    localStorage.setItem('is_db_created', 'true');
    console.log('Master key created');
    return true;
  } else {
    return false;
  }
}

async function loadMasterKey(key){
    const hashed = await hash256(key);

    return new Promise(
      function (resolve, reject) {
      var loaded = '';
  
      var request = window.indexedDB.open(dbName);
  
      request.onerror = function(event) {
        console.error(`Database error: ${event.target.errorCode}`);
      };
  
      request.onsuccess = function(event) {
        var database = event.target.result;
        var transaction = database.transaction(dbMaster, 'readonly');
        var objectRequest = transaction.objectStore(dbMaster);
                  
        objectRequest.openCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
              loaded = cursor.value;
              cursor.continue();
          }
        };
    
        transaction.oncomplete = function () {
          if (loaded.key === hashed){
            resolve(loaded.phrase);
            database.close();
          } else {
          reject('Cant fint the key')
        }
          
        };
      }
    }); 
}

function resetSignatures(){
  var request = window.indexedDB.open(dbName);

  request.onerror = function(event) {
    console.error(`Database error: ${event.target.errorCode}`);
  };

  request.onupgradeneeded = function (event) {
    var database = event.target.result;
    var createMasterStore = database.createObjectStore(dbMaster, { autoIncrement: true });
    createMasterStore.createIndex('id', 'id', { unique: true });
    var createSigStore = database.createObjectStore(dbSigs, { autoIncrement: true });
  };

  request.onsuccess = function(event) {
    var database = event.target.result;
    //delete all from dbSig 
    const transaction = database.transaction([dbSigs], 'readwrite');
    const objectStore = transaction.objectStore(dbSigs);
    // Make a request to clear all the data out of the object store
    const objectStoreRequest = objectStore.clear();

    objectStoreRequest.onsuccess = (event) => {
    // report the success of our request
    console.log('Signatures reset');
    };

    transaction.onerror = (event) => {
      return;
    }

    transaction.oncomplete = (event) => {
      // report the success of our request
      database.close();
    };
  }
}

function resetMasterPassword(){
  var request = window.indexedDB.open(dbName);

  request.onerror = function(event) {
    console.error(`Database error: ${event.target.errorCode}`);
  };

  request.onsuccess = function(event) {
    var database = event.target.result;
    //delete all from dbSig 
    const transaction = database.transaction([dbMaster], 'readwrite');
    const objectStore = transaction.objectStore(dbMaster);
    // Make a request to clear all the data out of the object store
    const objectStoreRequest = objectStore.clear();

    transaction.onerror = (event) => {
      return;
    }

    objectStoreRequest.onsuccess = (event) => {
    // report the success of our request
    console.log('Signatures reset');
    };

    transaction.oncomplete = (event) => {
      // report the success of our request
      database.close();
    };
  }
}

//input files methods
async function captureStream(){

}

async function stopStream(){

}

//seassion handler
async function clearSession(){
  sessionSamples = [];
}

async function clearBuffer(){
  buffer = [];
}

//listeners
window.addEventListener('load', () => {

  document.addEventListener('keydown', event => {
    if (!recording) return;
    var key = event.key;
    if (key == '.') key = 'period';
    // we are only interested in 
    if (charList.indexOf(key) === -1) return;
    const el = {
      key: key, //.toLowerCase(), //FIX
      event: 'down',
      time: performance.now()
    }
    buffer.push(el);
  });

  document.addEventListener('keyup', event => {
    if (!recording) return;
    var key = event.key;
    if (key == '.') key = 'period';
    // we are only interested in 
    if (charList.indexOf(key) === -1) return;
    const el = {
      key: key, //.toLowerCase(),
      event: 'up',
      time: performance.now()
    }
    buffer.push(el);
  });
});