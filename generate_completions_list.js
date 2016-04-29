var fs = require('fs');

if (!process.argv[2] || !process.argv[3]) {
    throw 'Usage: node scripts/generate_hubdoc_completions_list.js robot_methods_file_location sublime_packages_location';
}

var robot_location = process.argv[2];
var packages_location = process.argv[3];
var base_file_name = robot_location.match(/\/(\w+)\.js$/)[1];

// list of function names with their corresponding callback params
var function_callbacks = [
    {
        regex: /jget|jpost/,
        params: 'req, json'
    },
    {
        regex: /^(:?get|post)$/,
        params: 'req, $, body'
    },
    {
        regex: /evaluate_with_click|_go/, // matches browser_go and page_go
        params: 'url, page, body'
    },
    {
        regex: /wait_for/,
        params: 'err'
    },
    {
        regex: /get_question/,
        params: 'answer'
    },
    {
        regex: /pdf_and_text/,
        params: 'err, buf, txt'
    }
]

// don't add these params as they are optional and not used often
var params_to_skip = [
    /domain/,
    /options/
]

function createTrigger(line) {
    var function_name = line.match(/\.(\w[\w_]+)\s?=\s?function/)[1];

    var args_array_match = line.match(/function\s?\(([\w\s,]+)\)/);
    if (!args_array_match) return '';
    var args_array = args_array_match[1].split(',');
    var args_auto_complete = '(';

    for (var i = 0; i < args_array.length; i++) {
        var arg = args_array[i].trim();
        var n = i + 1;

        var skip = false;
        for (var j = 0; j < params_to_skip.length; j++) {
            if (params_to_skip[j].test(arg)) skip = true;
        }

        // Separate arguments with a comma and a space
        if (!skip && i != 0) args_auto_complete += ', ';

        // fill in the code/callback argument
        if (/code/.test(arg) || /cb/.test(arg) || /callback/.test(arg)) {
            var replaced = false;

            // go through the list of possible function callbacks to determine what params to put
            //   in the callback
            for (var k = 0; k < function_callbacks.length; k++) {
                if (function_callbacks[k].regex.test(function_name)) {
                    args_auto_complete += 'function(' + function_callbacks[k].params + ') {\\n\\t$' + n + '\\n}';
                    replaced = true;
                }
            }

            // if the argument has not been replaced yet, replace it with default
            if (!replaced) {
                args_auto_complete += 'function() {\\n\\t$' + n + '\\n}';
            }
        } else if (/^page$/.test(arg)) {
            args_auto_complete += arg;
        } else if (!skip) {
            args_auto_complete += '${' + n + ':' + arg + '}';
        }
    }

    args_auto_complete += ')';

    return '\n\t\t{\n\t\t\t"trigger": "' + function_name + '\\t' + base_file_name + '.js",\n\t\t\t"contents": "' 
                + function_name + args_auto_complete + '"\n\t\t},';
}

fs.readFile(robot_location, function(err, data) {
    if (err) throw err;
    var content = '{\n\t"scope": "source.js",\n\n\t"completions": [';

    var lines_array = data.toString().split('\n');

    for (var i = 0; i < lines_array.length; i++) {
        if (/Robot\.prototype\.[a-zA-Z]\w+\s?=\s?function/.test(lines_array[i])
                || /page\.[a-zA-Z]\w+\s?=\s?function/.test(lines_array[i])) {
            content += createTrigger(lines_array[i]);
        }
    }

    content += '\n\t]\n}';
    //console.log(content);

    var save_location = packages_location + '/' + base_file_name + '.sublime-completions';

    fs.writeFile(save_location, content, function(err) {
        if (err) throw err;
        console.log('Done. Saved to ' + save_location);
    })
})
