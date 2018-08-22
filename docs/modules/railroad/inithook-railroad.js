// locate previous DOM node, take innerHTML as non-html input
var thisScript=document.currentScript;
var textDiv=thisScript.previousElementSibling;
var textpre=textDiv.childNodes[0];
var diagramText=textpre.innerText||textDiv.textContext;

// create diagram from text
try {
    var results = eval(diagramText).format();
    textDiv.innerHTML="";
    results.addTo(textDiv);
} catch (e) {
    textDiv.innerHTML = "Invalid input in\n" + diagramText + "\n" + e;
}

