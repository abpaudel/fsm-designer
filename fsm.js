/*
 Finite State Machine Designer (http://madebyevan.com/fsm/)
 License: MIT License (see below)

 Copyright (c) 2010 Evan Wallace

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/

function Link(a, b) {
    this.nodeA = a;
    this.nodeB = b;
    this.text = '';
    this.formattedText = '';
    this.lineAngleAdjust = 0; // value to add to textAngle when link is straight line

    // make anchor point relative to the locations of nodeA and nodeB
    this.parallelPart = 0.5; // percentage from nodeA to nodeB
    this.perpendicularPart = 0; // pixels from line between nodeA and nodeB
}

Link.prototype.getAnchorPoint = function () {
    var dx = this.nodeB.x - this.nodeA.x;
    var dy = this.nodeB.y - this.nodeA.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
        'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
    };
};

Link.prototype.setAnchorPoint = function (x, y) {
    var dx = this.nodeB.x - this.nodeA.x;
    var dy = this.nodeB.y - this.nodeA.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
    this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
    // snap to a straight line
    if (this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
        this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
        this.perpendicularPart = 0;
    }
};

Link.prototype.getEndPointsAndCircle = function () {
    if (this.perpendicularPart == 0) {
        var midX = (this.nodeA.x + this.nodeB.x) / 2;
        var midY = (this.nodeA.y + this.nodeB.y) / 2;
        var start = this.nodeA.closestPointOnCircle(midX, midY);
        var end = this.nodeB.closestPointOnCircle(midX, midY);
        return {
            'hasCircle': false,
            'startX': start.x,
            'startY': start.y,
            'endX': end.x,
            'endY': end.y,
        };
    }
    var anchor = this.getAnchorPoint();
    var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
    var isReversed = (this.perpendicularPart > 0);
    var reverseScale = isReversed ? 1 : -1;
    var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
    var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
    var startX = circle.x + circle.radius * Math.cos(startAngle);
    var startY = circle.y + circle.radius * Math.sin(startAngle);
    var endX = circle.x + circle.radius * Math.cos(endAngle);
    var endY = circle.y + circle.radius * Math.sin(endAngle);
    return {
        'hasCircle': true,
        'startX': startX,
        'startY': startY,
        'endX': endX,
        'endY': endY,
        'startAngle': startAngle,
        'endAngle': endAngle,
        'circleX': circle.x,
        'circleY': circle.y,
        'circleRadius': circle.radius,
        'reverseScale': reverseScale,
        'isReversed': isReversed,
    };
};

Link.prototype.draw = function (c) {
    var stuff = this.getEndPointsAndCircle();
    // draw arc
    c.beginPath();
    if (stuff.hasCircle) {
        c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
    } else {
        c.moveTo(stuff.startX, stuff.startY);
        c.lineTo(stuff.endX, stuff.endY);
    }
    c.stroke();
    // draw the head of the arrow
    if (stuff.hasCircle) {
        drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
    } else {
        drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
    }
    // draw the text
    if (stuff.hasCircle) {
        var startAngle = stuff.startAngle;
        var endAngle = stuff.endAngle;
        if (endAngle < startAngle) {
            endAngle += Math.PI * 2;
        }
        var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
        var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
        var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
        drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
    } else {
        var textX = (stuff.startX + stuff.endX) / 2;
        var textY = (stuff.startY + stuff.endY) / 2;
        var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
        drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
    }
};

Link.prototype.containsPoint = function (x, y) {
    var stuff = this.getEndPointsAndCircle();
    if (stuff.hasCircle) {
        var dx = x - stuff.circleX;
        var dy = y - stuff.circleY;
        var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
        if (Math.abs(distance) < hitTargetPadding) {
            var angle = Math.atan2(dy, dx);
            var startAngle = stuff.startAngle;
            var endAngle = stuff.endAngle;
            if (stuff.isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            if (angle < startAngle) {
                angle += Math.PI * 2;
            } else if (angle > endAngle) {
                angle -= Math.PI * 2;
            }
            return (angle > startAngle && angle < endAngle);
        }
    } else {
        var dx = stuff.endX - stuff.startX;
        var dy = stuff.endY - stuff.startY;
        var length = Math.sqrt(dx * dx + dy * dy);
        var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
        var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
        return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
    }
    return false;
};

function Node(x, y) {
    this.x = x;
    this.y = y;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.isAcceptState = false;
    this.text = '';
    this.formattedText = '';
    this.textOnly = false;
}

Node.prototype.setMouseStart = function (x, y) {
    this.mouseOffsetX = this.x - x;
    this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function (x, y) {
    this.x = x + this.mouseOffsetX;
    this.y = y + this.mouseOffsetY;
};

Node.prototype.draw = function (c) {
    if (this.textOnly) {
        drawText(c, this.text, this.x, this.y, null, selectedObject == this);
        return;
    }

    // draw the circle
    c.beginPath();
    c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
    c.stroke();

    // draw the text
    drawText(c, this.text, this.x, this.y, null, selectedObject == this);

    // draw a double circle for an accept state
    if (this.isAcceptState) {
        c.beginPath();
        c.arc(this.x, this.y, nodeRadius - 6, 0, 2 * Math.PI, false);
        c.stroke();
    }
};

Node.prototype.closestPointOnCircle = function (x, y) {
    var dx = x - this.x;
    var dy = y - this.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.x + dx * nodeRadius / scale,
        'y': this.y + dy * nodeRadius / scale,
    };
};

Node.prototype.containsPoint = function (x, y) {
    return (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y) < nodeRadius * nodeRadius;
};

function SelfLink(node, mouse) {
    this.node = node;
    this.anchorAngle = 0;
    this.mouseOffsetAngle = 0;
    this.text = '';
    this.formattedText = '';

    if (mouse) {
        this.setAnchorPoint(mouse.x, mouse.y);
    }
}

SelfLink.prototype.setMouseStart = function (x, y) {
    this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
};

SelfLink.prototype.setAnchorPoint = function (x, y) {
    this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
    // snap to 90 degrees
    var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
    // keep in the range -pi to pi so our containsPoint() function always works
    if (this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
    if (this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

SelfLink.prototype.getEndPointsAndCircle = function () {
    var circleX = this.node.x + 1.5 * nodeRadius * Math.cos(this.anchorAngle);
    var circleY = this.node.y + 1.5 * nodeRadius * Math.sin(this.anchorAngle);
    var circleRadius = 0.75 * nodeRadius;
    var startAngle = this.anchorAngle - Math.PI * 0.8;
    var endAngle = this.anchorAngle + Math.PI * 0.8;
    var startX = circleX + circleRadius * Math.cos(startAngle);
    var startY = circleY + circleRadius * Math.sin(startAngle);
    var endX = circleX + circleRadius * Math.cos(endAngle);
    var endY = circleY + circleRadius * Math.sin(endAngle);
    return {
        'hasCircle': true,
        'startX': startX,
        'startY': startY,
        'endX': endX,
        'endY': endY,
        'startAngle': startAngle,
        'endAngle': endAngle,
        'circleX': circleX,
        'circleY': circleY,
        'circleRadius': circleRadius
    };
};

SelfLink.prototype.draw = function (c) {
    var stuff = this.getEndPointsAndCircle();
    // draw arc
    c.beginPath();
    c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, false);
    c.stroke();
    // draw the text on the loop farthest from the node
    var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
    var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
    drawText(c, this.text, textX, textY, this.anchorAngle, selectedObject == this);
    // draw the head of the arrow
    drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
};

SelfLink.prototype.containsPoint = function (x, y) {
    var stuff = this.getEndPointsAndCircle();
    var dx = x - stuff.circleX;
    var dy = y - stuff.circleY;
    var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
    return (Math.abs(distance) < hitTargetPadding);
};

function StartLink(node, start) {
    this.node = node;
    this.deltaX = 0;
    this.deltaY = 0;
    this.text = '';
    this.formattedText = '';

    if (start) {
        this.setAnchorPoint(start.x, start.y);
    }
}

StartLink.prototype.setAnchorPoint = function (x, y) {
    this.deltaX = x - this.node.x;
    this.deltaY = y - this.node.y;

    if (Math.abs(this.deltaX) < snapToPadding) {
        this.deltaX = 0;
    }

    if (Math.abs(this.deltaY) < snapToPadding) {
        this.deltaY = 0;
    }
};

StartLink.prototype.getEndPoints = function () {
    var startX = this.node.x + this.deltaX;
    var startY = this.node.y + this.deltaY;
    var end = this.node.closestPointOnCircle(startX, startY);
    return {
        'startX': startX,
        'startY': startY,
        'endX': end.x,
        'endY': end.y,
    };
};

StartLink.prototype.draw = function (c) {
    var stuff = this.getEndPoints();

    // draw the line
    c.beginPath();
    c.moveTo(stuff.startX, stuff.startY);
    c.lineTo(stuff.endX, stuff.endY);
    c.stroke();

    // draw the text at the end without the arrow
    var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
    drawText(c, this.text, stuff.startX, stuff.startY, textAngle, selectedObject == this);

    // draw the head of the arrow
    drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
};

StartLink.prototype.containsPoint = function (x, y) {
    var stuff = this.getEndPoints();
    var dx = stuff.endX - stuff.startX;
    var dy = stuff.endY - stuff.startY;
    var length = Math.sqrt(dx * dx + dy * dy);
    var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
    var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
    return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
};

function TemporaryLink(from, to) {
    this.from = from;
    this.to = to;
}

TemporaryLink.prototype.draw = function (c) {
    // draw the line
    c.beginPath();
    c.moveTo(this.to.x, this.to.y);
    c.lineTo(this.from.x, this.from.y);
    c.stroke();

    // draw the head of the arrow
    drawArrow(c, this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
};

// draw using this instead of a canvas and call toLaTeX() afterward
function ExportAsLaTeX(bounds) {
    this.bounds = bounds;
    this._points = [];
    this._texData = '';
    this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)

    this.toLaTeX = function () {
        return '% Please add \\usepackage{tikz} to your document preamble.\n\n' +
            '\\begin{center}\n' +
            '\\begin{tikzpicture}[scale=0.2]\n' +
            '\\tikzstyle{every node}+=[inner sep=0pt]\n' +
            this._texData +
            '\\end{tikzpicture}\n' +
            '\\end{center}\n';
    };

    this.beginPath = function () {
        this._points = [];
    };
    this.arc = function (x, y, radius, startAngle, endAngle, isReversed) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        x *= this._scale;
        y *= this._scale;
        radius *= this._scale;
        if (endAngle - startAngle == Math.PI * 2) {
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
        } else {
            if (isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            // TikZ needs the angles to be in between -2pi and 2pi or it breaks
            if (Math.min(startAngle, endAngle) < -2 * Math.PI) {
                startAngle += 2 * Math.PI;
                endAngle += 2 * Math.PI;
            } else if (Math.max(startAngle, endAngle) > 2 * Math.PI) {
                startAngle -= 2 * Math.PI;
                endAngle -= 2 * Math.PI;
            }
            startAngle = -startAngle;
            endAngle = -endAngle;
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x + radius * Math.cos(startAngle), 3) + ',' + fixed(-y + radius * Math.sin(startAngle), 3) + ') arc (' + fixed(startAngle * 180 / Math.PI, 5) + ':' + fixed(endAngle * 180 / Math.PI, 5) + ':' + fixed(radius, 3) + ');\n';
        }
    };
    this.moveTo = this.lineTo = function (x, y) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        x *= this._scale;
        y *= this._scale;
        this._points.push({ 'x': x, 'y': y });
    };
    this.stroke = function () {
        if (this._points.length == 0) return;
        this._texData += '\\draw [' + this.strokeStyle + ']';
        for (var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.fill = function () {
        if (this._points.length == 0) return;
        this._texData += '\\fill [' + this.strokeStyle + ']';
        for (var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.measureText = function (text) {
        var c = canvas.getContext('2d');
        c.font = '20px "Times New Romain", serif';
        return c.measureText(text);
    };
    this.advancedFillText = function (text, originalText, x, y, angleOrNull) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        if (text.replace(' ', '').length > 0) {
            var nodeParams = '';
            // x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
            if (angleOrNull != null) {
                var width = this.measureText(text).width;
                var dx = Math.cos(angleOrNull);
                var dy = Math.sin(angleOrNull);
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) nodeParams = '[right,align=center] ', x -= width / 2;
                    else nodeParams = '[left,align=center] ', x += width / 2;
                } else {
                    if (dy > 0) nodeParams = '[below,align=center] ', y -= 10;
                    else nodeParams = '[above,align=center] ', y += 10;
                }
            }
            x *= this._scale;
            y *= this._scale;
            // Escape curly braces
            var formattedText = originalText.replace(/{/g, "\\{");
            formattedText = formattedText.replace(/}/g, "\\}");
            // For LateX compatibility, replace node names like "q_1_0" with "q_{10}"
            formattedText = formattedText.replace(/_(\d+)_(\d+)/g, '_{\$1\$2}');
            // Escape $ characters
            formattedText = formattedText.replace(/\$/g, "\\$");
            // Replace \\ used to denote line breaks to $\\$. This ends math mode, breaks line and begins math mode again.
            formattedText = formattedText.replace(/\\\\/g, "$\\\\$");
            this._texData += '\\draw (' + fixed(x, 2) + ',' + fixed(-y, 2) + ') node ' + nodeParams + '{$' + formattedText + '$};\n';
        }
    };

    this.translate = this.save = this.restore = this.clearRect = function () { };
}

// draw using this instead of a canvas and call toSVG() afterward
function ExportAsSVG(bounds) {
    this.width = bounds[2] - bounds[0];
    this.height = bounds[3] - bounds[1];
    this.bounds = bounds;
    this.fillStyle = 'black';
    this.strokeStyle = 'black';
    this.lineWidth = 1;
    this.font = '12px Arial, sans-serif';
    this._points = [];
    this._svgData = '';
    this._transX = 0;
    this._transY = 0;

    this.toSVG = function () {
        var data = '<?xml version="1.0" standalone="no"?>\n';
        data += '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n\n';
        data += '<svg width="' + this.width + '" height="' + this.height + '" version="1.1" xmlns="http://www.w3.org/2000/svg">\n';
        data += this._svgData;
        data += '</svg>\n';
        return data;
    };

    this.beginPath = function () {
        this._points = [];
    };
    this.arc = function (x, y, radius, startAngle, endAngle, isReversed) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        x += this._transX;
        y += this._transY;
        var style = 'stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" fill="none"';

        if (endAngle - startAngle == Math.PI * 2) {
            this._svgData += '\t<ellipse ' + style + ' cx="' + fixed(x, 3) + '" cy="' + fixed(y, 3) + '" rx="' + fixed(radius, 3) + '" ry="' + fixed(radius, 3) + '"/>\n';
        } else {
            if (isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }

            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }

            var startX = x + radius * Math.cos(startAngle);
            var startY = y + radius * Math.sin(startAngle);
            var endX = x + radius * Math.cos(endAngle);
            var endY = y + radius * Math.sin(endAngle);
            var useGreaterThan180 = (Math.abs(endAngle - startAngle) > Math.PI);
            var goInPositiveDirection = 1;

            this._svgData += '\t<path ' + style + ' d="';
            this._svgData += 'M ' + fixed(startX, 3) + ',' + fixed(startY, 3) + ' '; // startPoint(startX, startY)
            this._svgData += 'A ' + fixed(radius, 3) + ',' + fixed(radius, 3) + ' '; // radii(radius, radius)
            this._svgData += '0 '; // value of 0 means perfect circle, others mean ellipse
            this._svgData += +useGreaterThan180 + ' ';
            this._svgData += +goInPositiveDirection + ' ';
            this._svgData += fixed(endX, 3) + ',' + fixed(endY, 3); // endPoint(endX, endY)
            this._svgData += '"/>\n';
        }
    };
    this.moveTo = this.lineTo = function (x, y) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        x += this._transX;
        y += this._transY;
        this._points.push({ 'x': x, 'y': y });
    };
    this.stroke = function () {
        if (this._points.length == 0) return;
        this._svgData += '\t<polygon stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" points="';
        for (var i = 0; i < this._points.length; i++) {
            this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
        }
        this._svgData += '"/>\n';
    };
    this.fill = function () {
        if (this._points.length == 0) return;
        this._svgData += '\t<polygon fill="' + this.fillStyle + '" stroke-width="' + this.lineWidth + '" points="';
        for (var i = 0; i < this._points.length; i++) {
            this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
        }
        this._svgData += '"/>\n';
    };
    this.measureText = function (text) {
        var c = canvas.getContext('2d');
        c.font = '20px "Times New Romain", serif';
        return c.measureText(text);
    };
    this.fillText = function (text, x, y) {
        x -= this.bounds[0];
        y -= this.bounds[1];
        x += this._transX;
        y += this._transY;
        if (text.replace(' ', '').length > 0) {
            this._svgData += '\t<text x="' + fixed(x, 3) + '" y="' + fixed(y, 3) + '" font-family="Times New Roman" font-size="20">' + textToXML(text) + '</text>\n';
        }
    };
    this.translate = function (x, y) {
        this._transX = x;
        this._transY = y;
    };

    this.save = this.restore = this.clearRect = function () { };
}

var greekLetterNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'emptyset', 'rightarrow', 'leftarrow'];

function convertLatexShortcuts(text) {
    // html greek characters
    for (var i = 0; i < greekLetterNames.length; i++) {
        var name = greekLetterNames[i];
        if (name == "emptyset") {
            text = text.replace(new RegExp('\\\\' + name + ' ', 'g'), String.fromCharCode(8709));
            continue;
        }
        if (name == "rightarrow") {
            text = text.replace(new RegExp('\\\\' + name + ' ', 'g'), String.fromCharCode(8594));
            continue;
        }
        if (name == "leftarrow") {
            text = text.replace(new RegExp('\\\\' + name + ' ', 'g'), String.fromCharCode(8592));
            continue;
        }
        text = text.replace(new RegExp('\\\\' + name + ' ', 'g'), String.fromCharCode(913 + i + (i > 16)));
        text = text.replace(new RegExp('\\\\' + name.toLowerCase() + ' ', 'g'), String.fromCharCode(945 + i + (i > 16)));
    }

    // subscripts
    for (var i = 0; i < 10; i++) {
        text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
    }

    return text;
}

function textToXML(text) {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var result = '';
    for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c >= 0x20 && c <= 0x7E) {
            result += text[i];
        } else {
            result += '&#' + c + ';';
        }
    }
    return result;
}

function drawArrow(c, x, y, angle) {
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
    c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
    c.fill();
}

function canvasHasFocus() {
    return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
    text = convertLatexShortcuts(originalText);
    c.font = '20px "Times New Roman", serif';
    var width = c.measureText(text).width;

    // center the text
    x -= width / 2;

    // position the text intelligently if given an angle
    if (angleOrNull != null) {
        var cos = Math.cos(angleOrNull);
        var sin = Math.sin(angleOrNull);
        var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
        var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
        var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
        x += cornerPointX - sin * slide;
        y += cornerPointY + cos * slide;
    }

    // draw text and caret (round the coordinates so the caret falls on a pixel)
    if ('advancedFillText' in c) {
        c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
    } else {
        x = Math.round(x);
        y = Math.round(y);
        c.fillText(text, x, y + 6);
        if (isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
            var textBeforeCaret = originalText.substring(0, caretIndex);
            var formattedTextBeforeCaret = convertLatexShortcuts(textBeforeCaret);
            var textBeforeCaretWidth = c.measureText(formattedTextBeforeCaret).width;
            x += textBeforeCaretWidth;
            c.beginPath();
            c.moveTo(x, y - 10);
            c.lineTo(x, y + 10);
            c.stroke();
        }
    }
}

var caretTimer;
var caretVisible = true;
var caretIndex = 0;

function resetCaret() {
    clearInterval(caretTimer);
    caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
    caretVisible = true;
}

var canvas;
var canvasWidthInput;
var canvasHeightInput;
var nodeRadius = 30;
var nodes = [];
var links = [];
var states = [];
var statesIndex = -1;

var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var movingAllObjects = false;
var originalClick;

function clearCanvas() {
    nodes = [];
    links = [];
    localStorage.removeItem('fsm');
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    nodeRadius = 30;
    document.getElementById("rangeSlider").value = 30;
    document.getElementById("output").style.display = "none";
    canvas.width = 1800;
    canvas.height = 1000;
    canvasWidthInput.value = canvas.width;
    canvasHeightInput.value = canvas.height;
}

function makeNodeTextOnly() {
    if ("textOnly" in selectedObject) {
        selectedObject.textOnly = !selectedObject.textOnly;
        draw();
    }
}

function radiusChanged() {
    var newRadius = document.getElementById("rangeSlider").value;
    document.getElementById('sliderValue').innerHTML = newRadius;
    newRadius = parseInt(newRadius);
    nodeRadius = newRadius;
    draw();
}

function drawUsing(c) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(0.5, 0.5);

    for (var i = 0; i < nodes.length; i++) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
        nodes[i].draw(c);
    }
    for (var i = 0; i < links.length; i++) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
        links[i].draw(c);
    }
    if (currentLink != null) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = 'black';
        currentLink.draw(c);
    }

    c.restore();
}

function draw() {
    drawUsing(canvas.getContext('2d'));
    saveBackup();
}

function selectObject(x, y) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].containsPoint(x, y)) {
            return nodes[i];
        }
    }
    for (var i = 0; i < links.length; i++) {
        if (links[i].containsPoint(x, y)) {
            return links[i];
        }
    }
    return null;
}

function snapNode(node) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] == node) continue;

        if (Math.abs(node.x - nodes[i].x) < snapToPadding) {
            node.x = nodes[i].x;
        }

        if (Math.abs(node.y - nodes[i].y) < snapToPadding) {
            node.y = nodes[i].y;
        }
    }
}

window.onload = function () {
    canvas = document.getElementById('canvas');
    restoreBackup();
    canvasWidthInput = document.getElementById("canvasWidth");
    canvasHeightInput = document.getElementById("canvasHeight");
    canvasWidthInput.value = canvas.width;
    canvasHeightInput.value = canvas.height;
    updateStates();
    draw();

    document.querySelectorAll(".canvasSizeInput").forEach(function (elem) {
        elem.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                setCanvasSize();
            }
        });
    });

    canvas.onmousedown = function (e) {
        var mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);
        movingObject = false;
        originalClick = mouse;

        if (selectedObject != null) {
            if (shift && selectedObject instanceof Node) {
                currentLink = new SelfLink(selectedObject, mouse);
            } else {
                movingObject = true;
                deltaMouseX = deltaMouseY = 0;
                if (selectedObject.setMouseStart) {
                    selectedObject.setMouseStart(mouse.x, mouse.y);
                }
            }
            caretIndex = selectedObject.text.length;
            resetCaret();
        } else if (shift) {
            currentLink = new TemporaryLink(mouse, mouse);
        } else {
            movingAllObjects = true;
            canvas.style.cursor = "all-scroll";
        }

        draw();

        if (canvasHasFocus()) {
            // disable drag-and-drop only if the canvas is already focused
            return false;
        } else {
            // otherwise, let the browser switch the focus away from wherever it was
            resetCaret();
            return true;
        }
    };

    canvas.ondblclick = function (e) {
        var mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);

        if (selectedObject == null) {
            selectedObject = new Node(mouse.x, mouse.y);
            nodes.push(selectedObject);
            resetCaret();
            draw();
        } else if (selectedObject instanceof Node) {
            selectedObject.isAcceptState = !selectedObject.isAcceptState;
            draw();
        }
        caretIndex = selectedObject.text.length;
        updateStates();
    };
    var prevMouse = null;
    var mouse = null;

    canvas.onmousemove = function (e) {
        prevMouse = mouse;
        mouse = crossBrowserRelativeMousePos(e);

        if (currentLink != null) {
            var targetNode = selectObject(mouse.x, mouse.y);
            if (!(targetNode instanceof Node)) {
                targetNode = null;
            }

            if (selectedObject == null) {
                if (targetNode != null) {
                    currentLink = new StartLink(targetNode, originalClick);
                } else {
                    currentLink = new TemporaryLink(originalClick, mouse);
                }
            } else {
                if (targetNode == selectedObject) {
                    currentLink = new SelfLink(selectedObject, mouse);
                } else if (targetNode != null) {
                    currentLink = new Link(selectedObject, targetNode);
                } else {
                    currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
                }
            }
            draw();
        }

        else if (movingObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if (selectedObject instanceof Node) {
                snapNode(selectedObject);
            }
            draw();
        }

        else if (movingAllObjects) {
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].x += mouse.x - prevMouse.x;
                nodes[i].y += mouse.y - prevMouse.y;
            }

            draw();
        }
    };

    canvas.onmouseup = function (e) {
        canvas.style.cursor = "default";
        movingObject = false;
        movingAllObjects = false;

        if (currentLink != null) {
            if (!(currentLink instanceof TemporaryLink)) {
                selectedObject = currentLink;
                links.push(currentLink);
                caretIndex = 0;
                resetCaret();
            }
            currentLink = null;
            draw();
        }
        updateStates();
    };
}

var shift = false;

document.onkeydown = function (e) {
    var key = crossBrowserKey(e);

    if (key == 16) {
        shift = true;
    } else if (!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if (key == 8) { // backspace key
        if (selectedObject != null && 'text' in selectedObject) {
            // Get formatted text length
            formattedTextLength = selectedObject.formattedText.length;
            // Get the text after the caret
            var textAfterCaret = selectedObject.text.substring(caretIndex);
            // Remove characters until length of new formatted text decreases by 1
            do {
                var textBeforeCaret = selectedObject.text.substring(0, caretIndex - 1);
                var newText = textBeforeCaret + textAfterCaret
                var formattedNewText = convertLatexShortcuts(newText);
                if (--caretIndex < 0) {
                    caretIndex = 0;
                    break;
                }
            } while (formattedNewText.length != formattedTextLength - 1)

            selectedObject.text = newText;
            selectedObject.formattedText = formattedNewText;
            resetCaret();
            draw();
        }

        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    } else if (key == 46) { // delete key
        if (selectedObject != null) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i] == selectedObject) {
                    nodes.splice(i--, 1);
                }
            }
            for (var i = 0; i < links.length; i++) {
                if (links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
                    links.splice(i--, 1);
                }
            }
            selectedObject = null;
            draw();
        }
    }
};

document.onkeyup = function (e) {
    var key = crossBrowserKey(e);

    if (key == 16) {
        shift = false;
    }
    // Left arrow key
    if (key === 37) {
        if (selectedObject && selectedObject.text) {
            formattedTextLength = selectedObject.formattedText.length;
            do {
                if (--caretIndex < 0) {
                    caretIndex = 0;
                    break;
                }
                var textBeforeCaret = selectedObject.text.substring(0, caretIndex);
                var formattedTextBeforeCaret = convertLatexShortcuts(textBeforeCaret);
                var textAfterCaret = selectedObject.text.substring(caretIndex);
                var formattedTextAfterCaret = convertLatexShortcuts(textAfterCaret);
                var formattedNewText = formattedTextBeforeCaret + formattedTextAfterCaret
            } while (formattedNewText.length != formattedTextLength)

            resetCaret();
            draw();
        }
    }
    // Right arrow key
    if (key === 39) {
        if (selectedObject && selectedObject.text) {
            formattedTextLength = selectedObject.formattedText.length;
            do {
                if (++caretIndex > selectedObject.text.length) {
                    caretIndex = selectedObject.text.length;
                    break;
                }
                var textBeforeCaret = selectedObject.text.substring(0, caretIndex);
                var formattedTextBeforeCaret = convertLatexShortcuts(textBeforeCaret);
                var textAfterCaret = selectedObject.text.substring(caretIndex);
                var formattedTextAfterCaret = convertLatexShortcuts(textAfterCaret);
                var formattedNewText = formattedTextBeforeCaret + formattedTextAfterCaret
            } while (formattedNewText.length != formattedTextLength)
            resetCaret();
            draw();
        }
    }
    if (e.ctrlKey) {
        if (key == 90) // ctrl z
            getPreviousState();
        else if (key == 89) // ctrl y
            getNextState();
    }
    updateStates();
};

document.onkeypress = function (e) {
    // don't read keystrokes when other things have focus
    var key = crossBrowserKey(e);
    if (!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if (key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
        // Add the letter at the caret
        var newText = selectedObject.text.substring(0, caretIndex) + String.fromCharCode(key) + selectedObject.text.substring(caretIndex);
        caretIndex++;
        // Update the selected objects text
        selectedObject.text = newText;
        selectedObject.formattedText = convertLatexShortcuts(newText);;
        // Draw the new text
        resetCaret();
        draw();

        // don't let keys do their actions (like space scrolls down the page)
        return false;
    } else if (key == 8) {
        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    }
};

function crossBrowserKey(e) {
    e = e || window.event;
    return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
    e = e || window.event;
    var obj = e.target || e.srcElement;
    var x = 0, y = 0;
    while (obj.offsetParent) {
        x += obj.offsetLeft;
        y += obj.offsetTop;
        obj = obj.offsetParent;
    }
    return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
    e = e || window.event;
    return {
        'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
        'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
    };
}

function crossBrowserRelativeMousePos(e) {
    var element = crossBrowserElementPos(e);
    var mouse = crossBrowserMousePos(e);
    return {
        'x': mouse.x - element.x,
        'y': mouse.y - element.y
    };
}

function output(text) {
    var element = document.getElementById('output');
    element.style.display = 'block';
    element.value = text;
}

function saveAsPNG() {
    // First, re-render the image with nothing selected.
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(canvas.getContext('2d'));
    selectedObject = oldSelectedObject;
    // Second, crop the image to only the part with content.
    var bounds = getBoundingRect();
    var croppedWidth = bounds[2] - bounds[0];
    var croppedHeight = bounds[3] - bounds[1];
    var croppedData = canvas.getContext('2d').getImageData(bounds[0], bounds[1], croppedWidth, croppedHeight);
    // Finally, create a temporary canvas to generate PNG data.
    var tmp = document.createElement("canvas");
    tmp.width = croppedWidth;
    tmp.height = croppedHeight;
    tmp.getContext('2d').putImageData(croppedData, 0, 0);
    var url = tmp.toDataURL('image/png');
    var newTab = window.open(url, '_blank');
    // Release the URL when the tab or window is closed
    newTab.addEventListener('beforeunload', function () {
        URL.revokeObjectURL(url);
    });
}

// Returns a bounding rectangle that contains all non-empty pixels. Returns an
// array: [min x, min y, max x, max y].
function getBoundingRect() {
    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    var indexToLocation = function (i) {
        var pixelIndex = Math.floor(i / 4);
        var col = Math.floor(pixelIndex % canvas.width);
        var row = Math.floor(pixelIndex / canvas.width);
        return [col, row];
    };

    // Search for non-blank pixels and keep track of the outermost locations to
    // form the rectangle.
    var maxX = -1;
    var minX = canvas.width + 1;
    var maxY = -1;
    var minY = canvas.height + 1;
    for (var i = 0; i < imageData.data.length; i++) {
        if (imageData.data[i] != 0) {
            var loc = indexToLocation(i);
            var x = loc[0];
            var y = loc[1];
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
            if (y < minY) {
                minY = y;
            }
            if (y > maxY) {
                maxY = y;
            }
        }
    }
    // Return the full canvas if all pixels were blank.
    if (minX >= maxX) {
        return [0, 0, canvas.width, canvas.height];
    }
    // Add some padding around the image.
    var padding = 2;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    if (minX < 0) minX = 0;
    if (minY < 0) minY = 0;
    if (maxX > canvas.width) maxX = canvas.width;
    if (maxY > canvas.width) maxY = canvas.width;
    return [minX, minY, maxX, maxY];
}

function downloadFile(filename, data, type) {
    // Create a new Blob object from the Base64-encoded data
    var blob = new Blob([data], { type: type });
    // Create a URL for the Blob data
    var url = URL.createObjectURL(blob);
    // Open the URL in a new tab or window
    var newTab = window.open(url, '_blank');
    // Release the URL when the tab or window is closed
    newTab.addEventListener('beforeunload', function () {
        URL.revokeObjectURL(url);
    });
}

function downloadSVGFile(filename, svgData) {
    downloadFile(filename, svgData, 'image/svg+xml');
}

function saveAsSVG() {
    var bounds = getBoundingRect();
    var exporter = new ExportAsSVG(bounds);
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    var svgData = exporter.toSVG();
    downloadSVGFile("automaton.svg", svgData);
}

function saveAsLaTeX() {
    var bounds = getBoundingRect();
    var exporter = new ExportAsLaTeX(bounds);
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    var texData = exporter.toLaTeX();
    output(texData);
}

function saveAsJSON() {
    var jsonData = JSON.stringify(getBackupData());
    downloadFile("automaton_backup.json", jsonData, "text/json");
}

function jsonUploaded() {
    var uploadElement = document.getElementById("jsonUpload");
    if (uploadElement.files.length < 1) return;
    var file = uploadElement.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var content = e.target.result;
        try {
            var data = JSON.parse(content);
            clearCanvas();
            restoreFromBackupData(data);
            draw();
        } catch (e) {
            alert("Failed loading file " + file.name);
        }
    };
    reader.readAsText(file);
}

function uploadJSON() {
    var uploadElement = document.getElementById("jsonUpload");
    uploadElement.click();
}

function det(a, b, c, d, e, f, g, h, i) {
    return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g;
}

function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
    var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
    var bx = -det(x1 * x1 + y1 * y1, y1, 1, x2 * x2 + y2 * y2, y2, 1, x3 * x3 + y3 * y3, y3, 1);
    var by = det(x1 * x1 + y1 * y1, x1, 1, x2 * x2 + y2 * y2, x2, 1, x3 * x3 + y3 * y3, x3, 1);
    var c = -det(x1 * x1 + y1 * y1, x1, y1, x2 * x2 + y2 * y2, x2, y2, x3 * x3 + y3 * y3, x3, y3);
    return {
        'x': -bx / (2 * a),
        'y': -by / (2 * a),
        'radius': Math.sqrt(bx * bx + by * by - 4 * a * c) / (2 * Math.abs(a))
    };
}

function fixed(number, digits) {
    return number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

function restoreFromBackupData(backup) {
    canvas.width = backup.canvasWidth || canvas.width;
    canvas.height = backup.canvasHeight || canvas.height;
    canvasWidthInput = document.getElementById("canvasWidth");
    canvasHeightInput = document.getElementById("canvasHeight");
    canvasWidthInput.value = canvas.width;
    canvasHeightInput.value = canvas.height;
    for (var i = 0; i < backup.nodes.length; i++) {
        var backupNode = backup.nodes[i];
        var node = new Node(backupNode.x, backupNode.y);
        node.isAcceptState = backupNode.isAcceptState;
        node.text = backupNode.text;
        node.formattedText = convertLatexShortcuts(node.text)
        node.textOnly = backupNode.textOnly;
        nodes.push(node);
    }
    for (var i = 0; i < backup.links.length; i++) {
        var backupLink = backup.links[i];
        var link = null;
        if (backupLink.type == 'SelfLink') {
            link = new SelfLink(nodes[backupLink.node]);
            link.anchorAngle = backupLink.anchorAngle;
            link.text = backupLink.text;
            link.formattedText = convertLatexShortcuts(link.text)
        } else if (backupLink.type == 'StartLink') {
            link = new StartLink(nodes[backupLink.node]);
            link.deltaX = backupLink.deltaX;
            link.deltaY = backupLink.deltaY;
            link.text = backupLink.text;
            link.formattedText = convertLatexShortcuts(link.text)
        } else if (backupLink.type == 'Link') {
            link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
            link.parallelPart = backupLink.parallelPart;
            link.perpendicularPart = backupLink.perpendicularPart;
            link.text = backupLink.text;
            link.formattedText = convertLatexShortcuts(link.text)
            link.lineAngleAdjust = backupLink.lineAngleAdjust;
        }
        if (link != null) {
            links.push(link);
        }
    }
    nodeRadius = backup.nodeRadius;
}

function restoreBackup() {
    if (!localStorage || !JSON) {
        return;
    }

    try {
        var backup = JSON.parse(localStorage['fsm']);
        restoreFromBackupData(backup);
        draw();
    } catch (e) {
        localStorage['fsm'] = '';
    }
}

function getBackupData() {
    var backup = {
        'nodes': [],
        'links': [],
        'nodeRadius': nodeRadius,
        'canvasWidth': canvas.width,
        'canvasHeight': canvas.height
    };
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var backupNode = {
            'x': node.x,
            'y': node.y,
            'text': node.text,
            'isAcceptState': node.isAcceptState,
            'textOnly': node.textOnly,
        };
        backup.nodes.push(backupNode);
    }
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var backupLink = null;
        if (link instanceof SelfLink) {
            backupLink = {
                'type': 'SelfLink',
                'node': nodes.indexOf(link.node),
                'text': link.text,
                'anchorAngle': link.anchorAngle,
            };
        } else if (link instanceof StartLink) {
            backupLink = {
                'type': 'StartLink',
                'node': nodes.indexOf(link.node),
                'text': link.text,
                'deltaX': link.deltaX,
                'deltaY': link.deltaY,
            };
        } else if (link instanceof Link) {
            backupLink = {
                'type': 'Link',
                'nodeA': nodes.indexOf(link.nodeA),
                'nodeB': nodes.indexOf(link.nodeB),
                'text': link.text,
                'lineAngleAdjust': link.lineAngleAdjust,
                'parallelPart': link.parallelPart,
                'perpendicularPart': link.perpendicularPart,
            };
        }
        if (backupLink != null) {
            backup.links.push(backupLink);
        }
    }
    return backup;
}

function saveBackup() {
    if (!localStorage || !JSON) {
        return;
    }
    var backup = getBackupData();

    localStorage['fsm'] = JSON.stringify(backup);
}

function setCanvasSize() {
    if (canvas.width !== canvasWidthInput.value) {
        var diff = (canvasWidthInput.value - canvas.width) / 2;
        for (var i = 0; i < nodes.length; i++)
            nodes[i].x += diff;
    }
    canvas.width = canvasWidthInput.value;
    canvas.height = canvasHeightInput.value;
    draw();
    updateStates();
}

function updateStates() {
    var newState = saveJSONState();
    if (newState !== states[statesIndex]) {
        statesIndex++;
        states.length = statesIndex;
        states.push(saveJSONState());
    }
}

// Functions for Undo-Redo
function saveJSONState() {
    if (!JSON) {
        return;
    }
    return JSON.stringify(getBackupData());
}

function restoreJSONState(jsonString) {
    if (!JSON) {
        return;
    }
    try {
        var backup = JSON.parse(jsonString);
        nodes = [];
        links = [];
        restoreFromBackupData(backup);
    } catch (e) {
        alert("Import failed!");
    }
}

// Undo
function getPreviousState() {
    statesIndex--;
    if (statesIndex < 0) {
        statesIndex = 0;
        return;
    }
    restoreJSONState(states[statesIndex]);
    draw();
}

// Redo
function getNextState() {
    statesIndex++;
    if (statesIndex >= states.length) {
        statesIndex = states.length - 1;
        return;
    }
    restoreJSONState(states[statesIndex]);
    draw();
}
