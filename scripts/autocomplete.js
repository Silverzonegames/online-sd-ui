var availableTags = []

var maxTags = 10;

function split(val) {
    return val.split(/,\s*/);
}
function extractLast(term) {
    //limit tags
    return split(term).pop();
}

var tagTypes = [
    "General",
    "Artist",
    "Copyright",
    "Character",
    "Meta",
]

var aliases = {
    "1girls": "1girl",
}



document.getElementById("useAutocomplete").addEventListener("change", function (e) {
    if (!e.target.checked) {
        var elements = document.getElementsByClassName("autocomplete");
        //loop
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            $(element).autocomplete({ disabled: true });
        }
        return;
    }

    enableAutoComplete();
    
    
});
if(document.getElementById("useAutocomplete").checked){
    enableAutoComplete();
}


function enableAutoComplete(){
    //read danbooru.csv
    fetch("danbooru.json").then(response => response.text()).then(data => {
        var json = JSON.parse(data);

        availableTags = json.map(tag => tag.tag);

        //loop through
        json.forEach(tag => {



            //split aliases
            var _aliases = tag.aliases;

            if (tag.aliases == "" || tag.aliases == null) {
                return;
            }

            if (typeof _aliases === 'string') {
                _aliases = _aliases.split(",");
                _aliases.forEach(alias => {
                    aliases[alias] = tag.tag;
                    availableTags.push(alias + " → " + tag.tag);
                });
            }
        });

        console.log(availableTags);

        //get all elements with autocomplete class
        var elements = document.getElementsByClassName("autocomplete");
        //loop
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            element.addEventListener("keydown", function (event) {
                if (event.keyCode === $.ui.keyCode.TAB &&
                    $(this).autocomplete("instance").menu.active) {
                    event.preventDefault();
                }
            });

            $(element).autocomplete({
                disabled: false,
                minLength: 1,
                source: function (request, response) {
                    // delegate back to autocomplete, but extract the last term

                    response($.ui.autocomplete.filter(availableTags, extractLast(request.term)).slice(0, maxTags));
                },
                focus: function () {
                    // prevent value inserted on focus
                    return false;
                },
                select: function (event, ui) {
                    var terms = split(this.value);
                    // remove the current input
                    terms.pop();
                    // add the selected item
                    var tag = ui.item.value;
                    if (tag.includes(" → ")) {
                        tag = tag.split(" → ")[1];
                    }

                    tag = tag.replace("_", " ");
                    tag = tag.replace("(", "\\(");
                    tag = tag.replace(")", "\\)");

                    terms.push(tag);
                    // add placeholder to get the comma-and-space at the end
                    terms.push("");
                    this.value = terms.join(", ");
                    return false;
                }
            });
        };
    });
}