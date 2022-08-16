var fs = require('fs');
var async = require('async');
var codes = require('./codes.js');

Object.defineProperty(String.prototype, 'to$', {
    enumerable: false,
    writable: true,
    configurable: true,
    value: function () { return Math.round(parseFloat(this) * 100)/100; }
});

Object.defineProperty(String.prototype, 'toYMD', {
    enumerable: false,
    writable: true,
    configurable: true,
    value: function () {
        return [ this.substr(0, 4), this.substr(4, 2), this.substr(6, 2) ].join('-');
    }
});

// splits a string (file content) into it's component lines
function splitString (str) {
    return str.replace(/\n|\r/ig, '')
        .split('~')
        .map(line => line.split('*'));
}

// returns the contents of a file as a string
function readFile (path) {
    return splitString(fs.readFileSync(path, 'utf8'));
}

// returns the first line with the given prefix
function getLine (lines, prefix, modifier = null) {
    for (var i = 0; i < lines.length; i++)
        if (lines[i][0] == prefix)
            if (modifier === null || (modifier !== null && lines[i][1] == modifier))
                return lines[i];
    
    return null;
}

// return all lines that match prefix
function getLines (lines, prefix, modifier = null) {
    var result = [];
    
    for (var i = 0; i < lines.length; i++)
        if (lines[i][0] == prefix)
            if (modifier === null || (modifier !== null && lines[i][1] == modifier))
                result.push(lines[i]);
    
    return result;
}

// count number of instances of lines that match prefx
function countLines (lines, prefix, modifier = null) {
    var count = 0;
    
    for (var i = 0; i < lines.length; i++)
        if (lines[i][0] == prefix)
            if (modifier === null || (modifier !== null && lines[i][1] == modifier))
                count++;
    
    return count;
}

// returns the start and end indices of a range that matches the start and end
function getRangeIndices (lines, start, end) {
    var i = -1;
    var j = -1;
    
    for (i = 0; i < lines.length; i++) {
        if (lines[i][0] == start) {
            for (j = i + 1; j < lines.length; j++) {
                if (lines[j][0] == end)
                    return [i, j];
            }
            
            return [ i, j ];
        }
    }
    
    return [ i, j ];
}

// returns an array of lines that starts with the first instance of the start and ends when end is found or when eof is reached
function getRange (lines, start, end) {
    var range = getRangeIndices(lines, start, end);
    
    return range[0] == -1 ? [] : lines.slice(range[0], range[1]);
}

// like getRange, but keeps searching for more ranges that match the given start and end or until eof is returned
function getRanges (lines, start, end) {
    var first = getRangeIndices(lines, start, end);
    var result = [ first ];
    var count = 0;
    
    if (first[0] == -1)
        return [];
    
    while (result[result.length - 1][1] < lines.length - 1) {
        var step = result[result.length - 1][1];
        var chunk = lines.slice(step);
        var range = getRangeIndices(chunk, start, end);
        
        if (range[0] == -1)
            break;
        
        range[0] += step;
        range[1] += step;
        
        result.push(range);
    }
    
    return result.map(range => lines.slice(range[0], range[1]));
}

// returns an object with check and claim information
function getClaims (lines) {
    
    // get check information
    var bpr = getLine(lines, 'BPR');
    var trn = getLine(lines, 'TRN');
    var n1 = getLine(lines, 'N1', 'PR');
    
    if (!bpr || !trn || !n1)
        return {};
    
    var amount = bpr[2].to$();
    var action = codes.check[bpr[3]] ;
    var method = bpr[4];
    var number = trn[2];
    var company = n1[2];
    var claims = countLines(lines, 'CLP');
    var services = countLines(lines, 'SVC');
    var check = { amount, action, method, company, number, claims, services };

    // get claims
    var claims = getRanges(lines, 'CLP', 'CLP').map(range => {
        var clp = getLine(range, 'CLP');
        var id = clp[1];
        var status = [ clp[2], codes.claim[clp[2]][0] ];
        var payment = clp[4].to$();
        var claimNumber = clp[7];
        var dateReceived = getLine(range, 'DTM', '050')[2].toYMD();
        var pt = getLine(range, 'NM1', 'QC');
        var pr = getLine(range, 'NM1', '82');
        
        var patient = {
            firstName: pt[4],
            lastName: pt[3],
            policyNumber: pt[9]
        };
        
        var provider = {
            firstName: pr[4],
            lastName: pr[3],
            npi: pr[9]
        };
        
        var services = getRanges(range, 'SVC', 'SVC').map(serviceRange => {
            var svc = getLine(serviceRange, 'SVC');
            var dos = getLine(serviceRange, 'DTM', '472')[2].toYMD();
            var cpt = svc[1].split(':')[1];
            var units = parseInt(svc[4] || 1);
            var payment = svc[3].to$();
            var remarks = getLines(serviceRange, 'CAS').map(rr => {
                return [
                    [ rr[1], rr[2] ].join('-'),
                    codes.group[rr[1]],
                    codes.adjustment[rr[2]],
                    rr[3]
                ];
                
            });
            
            return { dos, cpt, units, payment, remarks };
        });
        
        return { id, status, payment, claimNumber, dateReceived, patient, provider, services };
    });
    
    return {
        check,
        claims
    };
}

var parseFile = path => getClaims(readFile(path));
var parseFiles = paths => paths.map(parseFile);
var parseString = str => getClaims(splitString(str));

module.exports = {
    util: {
        splitString,
        readFile,
        getLine,
        getLines,
        getRangeIndices,
        getRange,
        getRanges,
        getClaims
    },
    parseFile,
    parseFiles,
    parseString
};