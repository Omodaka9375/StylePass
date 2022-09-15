
# Stylepass 

This is a single page, static website that can identify a person behind the keyboard using his typing style.

![Logo](typing.png)


## Installation

You can run *index.html* locally as ```file://```
or with a local server
    
## How it works


What is *magical phrase*? Magical phrase can be any word, email or username you choose, with more than 5 characters (no spaces). The longer the word the more secure it is. 
Unlike passwords, anyone can know your magical phrase, but they can't replicate your unique typing style.
Everything is encrypted with your *master password* and stored localy in IndexedDB. It works offline - no data leaves the browser. 


To create your signature you need to choose a magical phrase and master password. You will then be prompted to enter your magical phrase 4 times as consistently as you can.
This will create your master signature that can later be compared with the real input. This plays a crucial role in deciding if the person behind the keyboard is you.
You can export/import the data used to create your unique signature as a CSV file. By setting the difficulty level you are raising the threshold for required similarity.
This demo is for educational purposes only.

## Demo

[Live demo]()

## Related

You can read the full article here:
[Using Javascript to Identify Unique Typing Styles](https://hackernoon.com/using-javascript-to-identify-unique-typing-styles-k61b35bi)


## License

[GPL](LICENSE)
