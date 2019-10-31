# era-835

Dear Tormented Soul,

If you are reading this, you are probably in search of a simple answer/parser for the X12 835 data format. You are probably working on a project tangentially related to health care and need to process a god forsaken data format that's decades old. You ask yourself, why me? Why do I have to be the one trudging through the vile excrements of decades of bureaucratic bullshit? Which asinine idiot decided this would be the format to rule over a whole industry? This barbaric, chaotic, deprecate format, of all formats.

I understand your pain. Trust me, I do.

This package is the result of my pain and frustration. It is my attempt at understanding this format starting with little to no knowledge, armed only Google and about 3 poorly written and incomplete pieces of "documentation" from insurance websites where I've gleamed enough to finish my own project.

I hope this package can offer you some relief and is able to get you where you need to go. But please, read the __EXTREME DISCLAIMERS__ below to understand what you are about to use.

## EXTREME DISCLAIMERS

__This package is not meant for production.__ It literally has not been tested beyond the 4 or 5 files I've manually thrown at it. The information extracted from the files are only the fields I need and that's it. There is no plan for further implementation, updates, or support.

If this package is not extracting the information you need or you want it formatted differently, please take a look at __index.js__. That file *should* be fairly well documented, and I've done my best to break everything down into easy-to-understand and easy-to-modify chunks.

## Methods

__parseFile(path)__

Given the path to a data file, returns an object with the parsed data.

__parseFiles(paths)__

Given an array of strings as paths to data files, returns an array of objects with the parsed data.

__util.readFile(path)__

Given the path to a data file, returns an array of data ready to use in the following util files.

__util.getLine(lines, prefix, modifier = null)__

Given an array of data, returns the first line that matches the `prefix` and `modifier` (if used).

__util.getLines(lines, prefix, modifier = null)__

Given an array of data, returns an array of data that matches the `prefix` and `modifier` (if used).

__util.getRangeIndices(lines, start, end)__

Given an array of data, returns the start and end indices of the range of lines that start with `start` and ends with `end`. Does not include the line that starts with `end`. If `start` is not found, returns `[-1, -1]`. If `end` is not found, the end index becomes the length of the array.

__util.getRange(lines, start, end)__

Given an array of data, returns the first instance of a subset of the original data that starts with `start` and ends with `end` or end of the original data if no ending line match is found. Returns an empty array if no lines with the `start` prefix is found.

__util.getRanges(lines, start, end)__

Given an array of data, returns all instances of `util.getRange`.

__util.getClaims(lines)__

Given an array of data, returns all check and claim information.