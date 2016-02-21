/**
 * Romain 'dstate' Pichot
 * www.pichot.fr
 */

"use strict";

(function() {
    // Input
    var g_input = "5\n3 3\n9 6 3\n5 9 6\n3 5 9\n1 10\n0 1 2 3 4 5 6 7 8 7\n2 3\n7 6 7\n7 6 7\n5 5\n1 2 3 4 5\n2 9 3 9 6\n3 3 0 8 7\n4 9 8 9 8\n5 6 7 8 9\n2 13\n8 8 8 8 8 8 8 8 8 8 8 8 8\n8 8 8 8 8 8 8 8 8 8 8 8 8";

    // --------------------
    // -- Resolver class --
    // --------------------

    // Ctor
    var Resolver = function(map) {
        this.map = map;
        this.sinks = [];
    };

    // 1/ Find sinks
    // 2/ From each sink, mark all cell that belongs the the same basin
    // 3/ Outputs result
    Resolver.prototype.resolve = function(caseNb) {
        this.findSinks(0, 0);

        var that = this;
        this.sinks.map(function(sink, i) {
            that.markBasins(i, sink, null);
        });

        this.output(caseNb);
    };

    // Outputs result
    Resolver.prototype.output = function(caseNb) {
        console.log('Case #' + caseNb + ':');

        for (var y = 0; y < this.map.height; ++y) {
            var output = '';

            for (var x = 0; x < this.map.width; ++x) {
                if (x !== 0)
                    output += ' ';
                output += String.fromCharCode('a'.charCodeAt(0) + this.map.getBasin(x, y));
            }

            console.log(output);
        }
    };

    // Marks the basin of each cell
    // We found the different sinks, now we start from each of those and mark
    // every cell of the sink's basin
    Resolver.prototype.markBasins = function(basin, current, prev) {
        var currentVal = this.map.get(current.x, current.y);

        var directions = [
            // North - West - East - South
            {x: current.x, y: current.y - 1},
            {x: current.x - 1, y: current.y},
            {x: current.x + 1, y: current.y},
            {x: current.x, y: current.y + 1}
        ];

        var that = this;

        if (currentVal !== null
                && this.map.getBasin(current.x, current.y) === null) {
            var best = {val: null, coord: {x: null, y: null}};


            directions.map(function(v) {
                var direction = that.map.get(v.x, v.y);

                if (direction !== null && direction < currentVal) {
                    if (best.val === null || direction < best.val) {
                        best.val = direction;
                        best.coord = v;
                    }
                }
            });

            if (prev === null || (best.coord.x === prev.x && best.coord.y === prev.y)) {
                this.map.setBasin(current.x, current.y, basin);

                directions.map(function(v) {
                    that.markBasins(basin, v, current);
                });
            }
        }

    };

    // Find the different sinks in map
    // A sink is a cell that has an altitude strictly less or equal than
    // neighboring cells
    Resolver.prototype.findSinks = function(x, y) {
        var current = this.map.get(x, y);
        var that = this;

        if (current !== null) {
            var directions = [
                {x: x, y: y - 1},
                {x: x - 1, y: y},
                {x: x + 1, y: y},
                {x: x, y: y + 1}
            ];

            var isSink = true;
            directions.map(function(v) {
                var d = that.map.get(v.x, v.y);
                if (d !== null && d < current)
                    isSink = false;
            });

            if (isSink) {
                var exists = false;
                this.sinks.map(function(v) {
                    if (v.x === x && v.y === y)
                        exists = true;
                });

                if (!exists)
                    this.sinks.push({x: x, y: y});
            }

            this.findSinks(x + 1, y);
            this.findSinks(x, y + 1);
        }
    };

    // ---------------
    // -- Map Class --
    // ---------------

    // Ctor
    var Map = function(w, h) {
        this.height = h;
        this.width = w;
        this.map = [];

        // Initialize map
        for (var y = 0; y < this.height; ++y) {
            this.map[y] = [];

            for (var x = 0; x < this.width; ++x) {
                this.map[y].push('');
            }
        }
    };

    // Gets the value of a map cell
    Map.prototype.get = function(x, y) {
        if (this.isInBound(x, y))
            return this.map[y][x].data;

        return null;
    };

    // Set the value of a map cell
    Map.prototype.set = function(x, y, v) {
        if (this.isInBound(x, y))
            this.map[y][x] = {data: v, basin: null};
    };

    // Sets basin on a cell
    Map.prototype.setBasin = function(x, y, basin) {
        if (this.isInBound(x, y))
            this.map[y][x].basin = basin;
    };

    // Extract basin from a cell
    Map.prototype.getBasin = function(x, y) {
        if (this.isInBound(x, y))
            return this.map[y][x].basin;

        return null;
    };

    // Checks if coordinates are inside the map boundaries
    Map.prototype.isInBound = function(x, y) {
        return (x >= 0 && x < this.width && y >= 0 && y < this.height);
    }

    // Syntax used in the token list created by the lexer
    var Syntax = {
        NUMBER: "number",
        NULL: "null",

        separator: {
            EOL: "\n",
            SPACE: " "
        }
    };

    // ------------------
    // -- Parser Class --
    // ------------------

    // Ctor
    var Parser = function(input) {
        this.input = input;
        this.index = 0;
        this.tokens = [];
    };

    // Input string -> token list -> array of maps
    Parser.prototype.toMapArray = function() {
        this.index = 0;

        var mapArray = [];

        var lexer = new Lexer(this.input);
        this.tokens = lexer.tokenize();

        var mapsCount = this.getMapsCount();

        if (mapsCount !== null) {
            for (var i = 0; i < mapsCount; ++i) {
                var dimensions = this.getDimensions();

                if (dimensions !== null) {
                    mapArray.push(this.getMap(dimensions.w, dimensions.h));
                }
            }
        }

        return mapArray;
    };

    // Builds a new map object from input
    Parser.prototype.getMap = function(w, h) {
        var map = new Map(w, h);

        for (var row = 0; row < h; ++row) {
            var data = this.getRowData();

            if (data.length !== Number(w))
                return null;

            for (var col = 0; col < w; ++col) {
                map.set(col, row, data[col]);
            }

            if (this.getToken().type === Syntax.separator.EOL)
                ++this.index;
        }

        return map;
    };

    // Fills the map object with data read in the token list
    Parser.prototype.getRowData = function() {
        var data = [],
            i = 0;

        for (var token; (token = this.getToken(i)).type !== Syntax.NULL; ++i) {
            if (token.type === Syntax.NUMBER) {
                data.push(token.data);

                if ((this.getToken(i + 1)).type === Syntax.separator.SPACE)
                    ++i;
            } else {
                break ;
            }
        }

        this.index += i;

        return data;
    };

    // Reads the number of maps that should be present from the input
    Parser.prototype.getMapsCount = function() {
        var mapsCount = this.getToken(),
            eol = this.getToken(1);
        this.index += 2;

        if (mapsCount.type === Syntax.NUMBER) {
            if (mapsCount.data > 0) {
                return (eol.type === Syntax.separator.EOL) ?
                    mapsCount.data : null;
            } else {
                return 0;
            }
        }

        return null;
    };

    // Gets the height and width of the map we are reading
    Parser.prototype.getDimensions = function() {
        var h = this.getToken(),
            space = this.getToken(1),
            w = this.getToken(2),
            eol = this.getToken(3);
        this.index += 4;

        if (w.type === Syntax.NUMBER
                && space.type === Syntax.separator.SPACE
                && h.type === Syntax.NUMBER
                && eol.type === Syntax.separator.EOL)
            return {w: w.data, h: h.data};

        return null;
    };

    // Returns the token where the cursor is
    Parser.prototype.getToken = function(n) {
        n = typeof(n) !== 'undefined' ? n : 0;

        if (this.index + n < this.tokens.length) {
            return this.tokens[this.index + n];
        }

        return {data: null, type: Syntax.NULL};
    };

    // -----------------
    // -- Lexer Class --
    // -----------------

    // Ctor
    var Lexer = function(input) {
        this.input = input;
        this.cursor = 0;
        this.result = [];
    };

    // Creates a token list from the input string
    Lexer.prototype.tokenize = function() {
        this.cursor = 0;
        this.result = [];

        while (this.pickNumber() && this.pickSeparator()) {}

        return this.result;
    };

    // Reads a number from input string
    Lexer.prototype.pickNumber = function() {
        var n = '';

        while (!this.endOfInput() && !this.isSeparator(this.getCurrentChar())) {
            n += this.getCurrentChar();
            ++this.cursor;
        }

        if (n.length > 0) {
            this.addToken(n, Syntax.NUMBER);

            return true;
        }

        return false;
    };

    // Reads a separator from the input string
    Lexer.prototype.pickSeparator = function() {
        if (!this.endOfInput() && this.isSeparator(this.getCurrentChar())) {
            for (var sep in Syntax.separator) {
                if (this.getCurrentChar() === Syntax.separator[sep]) {
                    this.addToken(this.getCurrentChar(), Syntax.separator[sep]);
                    ++this.cursor;

                    break ;
                }
            }

            return true;
        }

        return false;
    };

    // Inserts a new token in the list
    Lexer.prototype.addToken = function(data, type) {
        this.result.push({
            data: data,
            type: type
        });
    };

    // Checks if the current character is a separator
    Lexer.prototype.isSeparator = function(c) {
        for (var sep in Syntax.separator) {
            if (Syntax.separator[sep] === c)
                return true;
        }

        return false;
    };

    // Returns the character the cursor is on
    Lexer.prototype.getCurrentChar = function() {
        if (this.cursor < this.input.length)
            return this.input[this.cursor];

        return null;
    };

    // Checks if we are at the end of the input string
    Lexer.prototype.endOfInput = function() {
        return this.cursor >= this.input.length;
    };


    // ----------
    // -- Main --
    // ----------
    (function() {
        var p = new Parser(g_input);
        var maps = p.toMapArray();

        maps.map(function(map, i) {
            var r = new Resolver(map);
            r.resolve(i + 1);
        });
    })();
})();

