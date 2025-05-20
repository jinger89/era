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

// returns the contents of a file as an array of lines
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
        
        if (range[0] == -1 || range[1] == -1)
            break;
        
        range[0] += step;
        range[1] += step;
        
        result.push(range);
        count++;
    }
    
    return result.map(range => lines.slice(range[0], range[1]));
}

// returns an object with check and claim information
function getClaims (lines) {
    
    // get check information
    var bpr = getLine(lines, 'BPR');
    var trn = getLine(lines, 'TRN');
    var dtm = getLine(lines, 'DTM', '405'); dtm = dtm ? dtm : getLine(lines, 'DTM', '472');
    var n1 = getLine(lines, 'N1', 'PR');
    
    if (!bpr || !trn || !n1)
        return {};
    
    var date = dtm[2]; date = [ date.substr(0,4), date.substr(4,2), date.substr(6) ].join('-');
    var amount = bpr[2].to$();
    var action = codes.check[bpr[3]] ;
    var method = bpr[4];
    var number = trn[2];
    var company = n1[2];
    var claims = countLines(lines, 'CLP');
    var services = countLines(lines, 'SVC');
    var check = { date, amount, action, method, company, number, claims, services };

    // get claims
    var claims = getRanges(lines, 'CLP', 'CLP').map(range => {
        var clp = getLine(range, 'CLP');
        var id = clp ? clp[1] : null;
        var status = [ clp ? clp[2] : null, clp ? codes.claim[clp[2]][0] : null ];
        var payment = clp ? clp[4].to$() : null;
        var claimNumber = clp ? clp[7] : null;
        var dateLine = getLine(range, 'DTM', '050');
        var dateReceived = dateLine ? dateLine[2].toYMD() : null;
        var dateStart = getLine(range, 'DTM', '232'); dateStart = dateStart && dateStart[2] ? dateStart[2].toYMD() : null;
        var dateEnd = getLine(range, 'DTM', '233'); dateEnd = dateEnd && dateEnd[2] ? dateEnd[2].toYMD() : null;
        var dateAdmit = getLine(range, 'DTM', '405'); dateAdmit = dateAdmit && dateAdmit[2] ? dateAdmit[2].toYMD() : null;
        var pt = getLine(range, 'NM1', 'QC');
        var pr = getLine(range, 'NM1', '82');
        
        var patient = {
            firstName: pt ? pt[4] : null,
            lastName: pt ? pt[3] : null,
            policyNumber: pt ? pt[9] : null
        };
        
        var provider = {
            firstName: pr ? pr[4] : null,
            lastName: pr ? pr[3] : null,
            npi: pr ? pr[9] : null
        };
        
        var services = getRanges(range, 'SVC', 'SVC').map(serviceRange => {
            var dos472 = getLine(serviceRange, 'DTM', '472'); dos472 = dos472 && dos472[2] ? dos472[2].toYMD() : null; // service date
            var dos232 = getLine(serviceRange, 'DTM', '232'); dos232 = dos232 && dos232[2] ? dos232[2].toYMD() : null; // dos start
            var dos233 = getLine(serviceRange, 'DTM', '233'); dos233 = dos233 && dos233[2] ? dos233[2].toYMD() : null; // dos end
            var dos405 = getLine(serviceRange, 'DTM', '405'); dos405 = dos405 && dos405[2] ? dos405[2].toYMD() : null; // admission date
            var dos = dos472 || dos232 || dos233 || dos405 || dateStart || dateEnd || dateAdmit || '0000-00-00';
            
            var svc = getLine(serviceRange, 'SVC');
            var cpt = svc ? svc[1].split(':')[1] : null;
            var units = svc ? parseInt(svc[4] || 1) : null;
            var payment = svc ? svc[3].to$() : null;
            var remarks = getLines(serviceRange, 'CAS').map(rr => {
                return [
                    rr ? [ rr[1], rr[2] ].join('-') : null,
                    rr ? codes.group[rr[1]] : null,
                    rr ? codes.adjustment[rr[2]] : null,
                    rr ? rr[3] : null
                ];
                
            });
            
            return { dos, cpt, units, payment, remarks };
        });
        
        return { id, status, payment, claimNumber, dateReceived, patient, provider, services };
    });
    
    // get adjustments
    var adjustments = getLines(lines, 'PLB').map(line => {
        var note = line[3];
        var amount = line[4].to$();
        
        return [ note, amount ];
    });
    
    return {
        check,
        claims,
        adjustments
    };
}

// returns an array of checks and claims
function getChecks (lines) {
    return getRanges(lines, 'ST', 'SE')
        .map(getClaims);
}

var parseFile = path => getChecks(readFile(path));
var parseFiles = paths => paths.map(parseFile);
var parseString = str => getChecks(splitString(str));

module.exports = {
    util: {
        splitString,
        readFile,
        getLine,
        getLines,
        getRangeIndices,
        getRange,
        getRanges,
        getClaims,
        getChecks
    },
    parseFile,
    parseFiles,
    parseString
};