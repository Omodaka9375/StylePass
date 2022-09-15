const charList = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@shift0123456789period.@';

const prefix = getPrefix();

var counter = 0;
var theKey = null;
var acc = 0;

window.onload = doBenchmark;

function showAbout(){
  var el = document.getElementById('about');
  if(el.style.display == 'block'){
    el.style.display = 'none';
  } else {
    el.style.display = 'block';
  }
}

function showImportInput(){
  var el = document.getElementById('showImport');
  if(el.style.display == 'block'){
    el.style.display = 'none';
  } else {
    el.style.display = 'block';
  }
}

function showImportInputOne(){
  var el = document.getElementById('showImportOpt');
  if(el.style.display == 'block'){
    el.style.display = 'none';
  } else {
    el.style.display = 'block';
  }
}

function showRedo(){
  //reset and show create page again
  document.getElementById('textRecord').removeAttribute('disabled');
  document.getElementById('showRedo').style.display = 'none';
  document.getElementById('saveBttn').style.display = 'none';
  document.getElementById('wrongBttn').style.display = 'none';
  document.getElementById('correctBttn').style.display = 'none';
  document.getElementById('recBttn').style.display = 'none';
  document.getElementById("counterView").textContent = 0;
  document.getElementById("textRecord").value = '';
  resetSignatures();
  showCreateTab();
}

function setDifficultyLvl() {
  var selectElement = document.getElementById('diffSelect');
  var diff = selectElement.value;
  setThreshold(diff);
}

function csvToArray(str, delimiter = ",") {
  // slice from start of text to the first \n index
  // use split to create an array from string by delimiter
  const headers = str.slice(0, str.indexOf("\n")).split(delimiter);

  // slice from \n index + 1 to the end of the text
  // use split to create an array of each csv value row
  const rows = str.slice(str.indexOf("\n") + 1).split("\n");

  // Map the rows
  // split values from each row into an array
  // use headers.reduce to create an object
  // object properties derived from headers:values
  // the object passed as an element of the array
  const arr = rows.map(function (row) {
    const values = row.split(delimiter);
    const el = headers.reduce(function (object, header, index) {
      object[header] = values[index];
      return object;
    }, {});
    return el;
  });

  // return the array
  return arr;
}

function handleUploadClick()
{
  var fileinput = document.getElementById("fileid");
  fileinput.click();
}

function handleUploadClickOne()
{
  var fileinput = document.getElementById("fileidOne");
  fileinput.click();
}

async function importSigsOne(e){
  var mastPass = document.getElementById('importMasterPassword').value;
  var magPhrase = document.getElementById('importMasterPhrase').value;

  if(mastPass == '' || magPhrase == ''){
    console.error("Master password and phrase can't be empty");
    return;
  }

  const reader = new FileReader();
  var samples = [];
  resetSignatures();
  resetMasterPassword();
  var created = await createMasterKey(mastPass,magPhrase);
  if(created){
    theKey = mastPass;
    reader.onload = function (e) {
      const text = e.target.result;
      const data = csvToArray(text);
      for(i=0; i < data.length-1; i++){
        var dt = Object.values(data[i]);
        var numberArray = dt.map(Number);
        samples.push(numberArray.toString());
      }
      for(i=0; i < samples.length; i++){
        saveSignature(samples[i]);
      }
      document.getElementById("showImportOpt").style.display = 'none';
      //showMatchTab();
    };

    reader.onloadend = function (e){
      setTimeout(() => {
        document.location.reload();
      }, 2500);
    }

    reader.readAsText(e.files[0]);
  } else {
    console.error('New master key not created!');
    return;
  }
}

async function importSigs(e){
  var mastPass = document.getElementById('importMastPass').value;
  var magPhrase = document.getElementById('importMastPhrase').value;

  if(mastPass == '' || magPhrase == ''){
    console.error("Master password and phrase can't be empty");
    return;
  }
  theKey = mastPass;
  resetSignatures();
  resetMasterPassword();

  const reader = new FileReader();
  var samples = [];

  var created = await createMasterKey(mastPass,magPhrase);
  if(created){
    theKey = mastPass;
    phrase = magPhrase;
    reader.onload = function (e) {
      const text = e.target.result;
      const data = csvToArray(text);
      for(i=0; i < data.length-1; i++){
        var dt = Object.values(data[i]);
        var numberArray = dt.map(Number);
        samples.push(numberArray.toString());
      }

      for(i=0; i < samples.length; i++){
        saveSignature(samples[i]);
      }

      document.getElementById("showImport").style.display = 'none';
      recording = false;

    };

    reader.onloadend = function (e){
      setTimeout(() => {
        document.location.reload();
      }, 2500);
    }

    reader.readAsText(e.files[0]);
  } else {
    console.error('New master key not created!');
    return;
  }
}

async function getMasterKey() {
  var pass = document.getElementById("startPassword").value;
  phrase = document.getElementById("startEmail").value;
  theKey = pass;
  const getkey = await createMasterKey(theKey, phrase);
  if(getkey){
    showCreateTab();
  } else {
    console.error("Can't create master key")
  }
}

async function checkMasterKey() {
  var pass = document.getElementById("loginPassword").value;

  if (pass == '') {
    document.getElementById("loginPassword").style.border = "1px solid red";
    return;
  }
  theKey = pass;

  const checkMasterKey = await loadMasterKey(theKey);
  if(checkMasterKey != false){
    phrase = checkMasterKey;
    var sigs = await getAllSignatures();
    sessionSamples = await loadAllSignatures(sigs, theKey);
    showMatchTab();    
  } else {
    document.getElementById("loginPassword").style.border = "1px solid red";
  }
}

function doBenchmark() {
  document.getElementById("textRecord").value = '';
  document.getElementById("testRecord").value = '';
  document.getElementById("counterView").value = counter;
  document.getElementById("minSampleView").textContent = minSampleReq;
  document.getElementById('startEmail').value = "";
  if (prefix === null) {
    document.getElementById("displayRes1").style.display = 'block';
    document.getElementById("displayRes1").textContent = "Your browser does not support High Resolution Time API";
  } else {
    const isDbCreated = isReady();
    if (!isDbCreated) {
      document.getElementById("loginStart").style.display = "none";
      document.getElementById("newStart").style.display = "block";
    } else {
      document.getElementById("loginStart").style.display = "block";
      document.getElementById("newStart").style.display = "none";
    }
  }
}

function showMatchTab() {
  document.getElementById("createTab").style.display = "none";
  document.getElementById("matchTab").style.display = "block";
  document.getElementById('displayRes').style.display = "none";
  document.getElementById('startTab').style.display = "none";
  document.getElementById("showMatching").style.display = 'none';
  document.getElementById('homeimage').style.display = 'none';
}

function showCreateTab() {
  counter = 0;
  recording = false;
  sessionSamples = [];
  sessionLabels = [];
  clearBuffer();;
  d3.select("svg").selectAll("*").remove();
  document.getElementById("createTab").style.display = "block";
  document.getElementById("matchTab").style.display = "none";
  document.getElementById('displayRes').style.display = "none";
  document.getElementById('startTab').style.display = "none";
  document.getElementById('displayRes1').style.display = "none";
  document.getElementById('homeimage').style.display = 'none';
}

function showStart() {
  document.getElementById("createTab").style.display = "none";
  document.getElementById("matchTab").style.display = "none";
  document.getElementById('displayRes').style.display = "none";
  document.getElementById('startTab').style.display = "block";
  document.getElementById('startEmail').value = "";
  document.getElementById('homeimage').style.display = 'block';
}

function startRecording() {
  document.getElementById('textRecord').style.border='initial';

  if (recording) {
    if(document.getElementById("textRecord").value != phrase){
      document.getElementById('textRecord').style.border = "1px solid red";
      document.getElementById("textRecord").value = '';
      return;
    }
    document.getElementById('textRecord').style.border = "1px solid gray";
    recording = false;
    document.getElementById("recBttn").style = 'display: none';
    document.getElementById("wrongBttn").style = 'display: none;';
    document.getElementById("correctBttn").style = 'display: static;width: 20px; padding-bottom: 5px; margin-left: -30px;';
    if (counter == minSampleReq - 1) {
      document.getElementById("saveBttn").style = 'width: 20px; cursor: pointer; margin-left: 10px;';
      document.getElementById('textRecord').setAttribute("disabled", true);
      showAccuracy();
      if(acc != 100){
        document.getElementById("showRedo").style.display= 'initial';
        document.getElementById("showMatching").style.display = 'none';
        document.getElementById("saveBttn").style.display = 'none'; 
      } else {
        document.getElementById("showMatching").style.display = 'initial';
        document.getElementById("showRedo").style.display= 'none';
      }
    }
    const {featureReady, labels} = extractFeatures();
    populateSamples(featureReady, labels);
    showKDEGraph();
  } else {
    clearBuffer();
    document.getElementById("textRecord").value = '';
    document.getElementById("recBttn").style = 'display: static;width: 20px; padding-bottom: 5px; margin-left: -30px;';
    document.getElementById("wrongBttn").style = 'display: none;';
    document.getElementById("correctBttn").style = 'display: none;';
    recording = true;
    //console.log('Started recording');
  }
}

function showAccuracy() {
  acc = 0;
  document.getElementById('displayRes1').textContent = '';
  document.getElementById('displayRes1').style = "display: block;";
  var proc  = getAccuracy(sessionSamples) * 100;
  acc = proc;
  document.getElementById('displayRes1').textContent = 'Consistancy: ' + acc + '%';
}

async function stopRecordingTest() {
  if(document.getElementById("testRecord").value != phrase){
    document.getElementById('displayRes').style = "display: block;";
    document.getElementById('displayRes').textContent = "Intruder 👮!";
    return;
  }
  recording = false;
  var testSample = extractOneFeature();
  if (testSample.length == 0){
    document.getElementById("wrongBttn").style = 'display: static; width: 20px; padding-bottom: 5px; margin-left: -30px;';
    document.getElementById("correctBttn").style = 'display: none';
  }
  var allSimilarities = [];

  for (var i = 0; i < sessionSamples.length; i++) {
    var pred = cosineSimilarity(sessionSamples[i], testSample);
    allSimilarities.push(pred);
  }

  var med = calculateMedian(allSimilarities);
  console.log(med)
  var res = med > threshold ? "❤️ It really is you" : "👮 Intruder!!!";
  var rest = med > threshold ? 0 : 1;

  if (rest == 0) {
    document.getElementById('correctBttn1').style = 'display: static;width: 20px; padding-bottom: 5px; margin-left: -30px;';
    document.getElementById('wrongBttn1').style = "display: none";
  } else if (rest == 1) {
    document.getElementById('correctBttn1').style = "display: none";
    document.getElementById('wrongBttn1').style = 'display: static; width: 20px; padding-bottom: 5px; margin-left: -30px;';
  }

  document.getElementById('displayRes').style = "display: block;";
  document.getElementById('displayRes').textContent = res;
}

function startRecordingTest() {
  clearBuffer();
  document.getElementById("testRecord").value = '';
  document.getElementById('correctBttn1').style = "display: none";
  document.getElementById('wrongBttn1').style = "display: none";
  document.getElementById('displayRes').style = "display: none;";
  recording = true;
  //console.log('Started recording');
}

function populateSamples(featureReady,labels){
  if(featureReady.length == 0){
    document.getElementById("wrongBttn").style = 'display: static; width: 20px; padding-bottom: 5px; margin-left: -30px;';
    document.getElementById("correctBttn").style = 'display: none';
    return;
  }
  sessionSamples.push(featureReady);
  sessionLabels = labels;
  counter++;
  document.getElementById("counterView").textContent = counter;
  saveSignature(featureReady.toString());
}

function saveSamples() {
  //merege and convert samples to CSV
  var labels = ["H.b","DD.b.a","UD.b.a","H.a","DD.a.n","UD.a.n","H.n","DD.n.e","UD.n.e","H.e"];
  var csv = labels + '\n';
  sessionSamples.forEach(function (row) {
    csv += row.join(',');
    csv += "\n";
  });
  var hiddenElement = document.createElement('a');
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
  hiddenElement.target = '_blank';
  hiddenElement.download = 'signatures.csv';
  hiddenElement.click();
}
//graph KDE
function showKDEGraph() {
  d3.select("svg").selectAll("*").remove();
  var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    margin = { top: 20, right: 30, bottom: 30, left: 40 };

  var x = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right]);

  var y = d3.scaleLinear()
    .domain([0, 1])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + (height - margin.bottom) + ")")
    .call(d3.axisBottom(x))
    .append("text")
    .attr("x", width - margin.right)
    .attr("y", -6)
    .attr("fill", "#000")
    .attr("text-anchor", "end")
    .attr("font-weight", "bold")
    .text("Time in seconds)");

  svg.append("g")
    .attr("class", "axis axis--y")
    .attr("transform", "translate(" + margin.left + ",0)")
    .call(d3.axisLeft(y).ticks(null));

  var faithful = sessionSamples[sessionSamples.length - 1];

  var n = faithful.length,
    bins = d3.histogram().domain(x.domain()).thresholds(sessionLabels.length)(faithful),
    density = kernelDensityEstimator(kernelEpanechnikov(0.0155), x.ticks(sessionLabels.length))(faithful);

  svg.insert("g", "*")
    .attr("fill", "#bbb")
    .selectAll("rect")
    .data(bins)
    .enter().append("rect")
    .attr("x", function (d) { return x(d.x0) + 1; })
    .attr("y", function (d) { return y(d.length / n); })
    .attr("width", function (d) { return x(d.x1) - x(d.x0) - 1; })
    .attr("height", function (d) { return y(0) - y(d.length / n); });

  svg.append("path")
    .datum(density)
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("d", d3.line()
      .curve(d3.curveBasis)
      .x(function (d) { return x(d[0]); })
      .y(function (d) { return y(d[1]); }));

}