/**
 * Module for render.
 */
var provvisRender = function () {

    var vis = Object.create(null),
        cell = Object.create(null);

    /* Initialize dom elements. */
    var node = Object.create(null),
        link = Object.create(null),
        analysis = Object.create(null),
        aNode = Object.create(null),
        saNode = Object.create(null),
        gridCell = Object.create(null),
        hLink = Object.create(null),
        hNode = Object.create(null);

    var nodes = [],
        links = [],
        iNodes = [],
        oNodes = [],
        aNodes = [],
        saNodes = [],
        nodeMap = [],
        nodePredMap = [],
        nodeSuccMap = [],
        nodeLinkPredMap = [],
        nodeLinkSuccMap = [],
        analysisWorkflowMap = [],
        width = 0,
        depth = 0,
        grid = [];

    /**
     * Drag start listener support for nodes.
     */
    var dragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    /**
     * Update node through translation while dragging or on dragend.
     * @param dom Node dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the node.
     * @param y The current y-coordinate for the node.
     */
    var updateNode = function (dom, n, x, y) {
        /* Drag selected node. */
        dom.attr("transform", function (d) {
            switch (d.nodeType) {
                case "dummy":
                case "raw":
                case "analysis":
                case "subanalysis":
                case "processed":
                    return "translate(" + x + "," + y + ")";
                case "special":
                    return "translate(" + (x - vis.radius) + "," + (y - vis.radius) + ")";
                case "dt":
                    return "translate(" + (x - vis.radius * 0.75) + "," + (y - vis.radius * 0.75) + ")";
            }
        });
    };

    /**
     * Update link through translation while dragging or on dragend.
     * @param dom Link dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the links.
     * @param y The current y-coordinate for the links.
     */
    var updateLink = function (dom, n, x, y) {
        /* Drag adjacent links. */

        var getNodeCoords = function (nodeId) {
            var curId = nodeId,
                coords = {x: -1, y: -1};

            while (nodes[curId].hidden) {
                curId = nodes[curId].parent.id;
            }
            coords.x = nodes[curId].x;
            coords.y = nodes[curId].y;

            return coords;
        };

        /* Get input links and update coordinates for x2 and y2. */
        nodeLinkPredMap[n.id].forEach(function (l) {
            d3.selectAll("#linkId-" + l + ", #hLinkId-" + l).attr("d", function (l) {
                var srcCoords = getNodeCoords(l.source.id),
                    pathSegment = " M" + srcCoords.x + "," + srcCoords.y;

                if (Math.abs(srcCoords.x - x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(srcCoords.x + (cell.width)) + "," + parseInt(y, 10) + " L" + parseInt(x, 10) + "," + parseInt(y, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(x, 10) + "," + parseInt(y, 10));
                }
                return pathSegment;
            });
        });

        /* Get output links and update coordinates for x1 and y1. */
        nodeLinkSuccMap[n.id].forEach(function (l) {
            d3.selectAll("#linkId-" + l + ", #hLinkId-" + l).attr("d", function (l) {
                var tarCoords = getNodeCoords(l.target.id),
                    pathSegment = " M" + parseInt(x, 10) + "," + parseInt(y, 10);

                if (Math.abs(x - tarCoords.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(x + cell.width, 10) + "," + tarCoords.y + " L" + tarCoords.x + " " + tarCoords.y);
                } else {
                    pathSegment = pathSegment.concat(" L" + tarCoords.x + "," + tarCoords.y);
                }
                return pathSegment;
            });
        });
    };

    /**
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {

        /* Drag selected node. */
        updateNode(d3.select(this), n, d3.event.x, d3.event.y);

        /* Drag adjacent links. */
        updateLink(d3.select(this), n, d3.event.x, d3.event.y);

        /* Update data. */
        n.col = Math.round(-1 * d3.event.x / cell.width);
        n.row = Math.round(d3.event.y / cell.height);
        n.x = -1 * n.col * cell.width;
        n.y = n.row * cell.height;
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function (n) {
        /* Update data. */
        n.col = Math.round(-1 * n.x / cell.width);
        n.row = Math.round(n.y / cell.height);
        n.x = -1 * n.col * cell.width;
        n.y = n.row * cell.height;

        /* Align selected node. */
        updateNode(d3.select(this), n, n.x, n.y);

        /* Align adjacent links. */
        updateLink(d3.select(this), n, n.x, n.y);
    };

    /**
     * Sets the drag events for nodes.
     */
    var applyDragBehavior = function () {
        /* Drag and drop node enabled. */
        var drag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".node").call(drag);
    };

    /**
     * Sets the drag events for analysis nodes.
     */
    var applyAnalysisDragBehavior = function () {

        /* Drag and drop node enabled. */
        var analysisDrag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".aNode").call(analysisDrag);
    };

    /**
     * Sets the drag events for sub-nalysis nodes.
     */
    var applySubanalysisDragBehavior = function () {

        /* Drag and drop node enabled. */
        var subanalysisDrag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".saNode").call(subanalysisDrag);
    };

    /**
     * Dye graph by analyses and its corresponding workflows.
     */
    var dyeWorkflows = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("stroke", function (d) {
                return vis.color(analysisWorkflowMap[d.analysis]);
            });
        });

    };

    /**
     * Dye graph by analyses.
     */
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("fill", function (d) {
                return vis.color(d.analysis);
            });
        });

    };

    /**
     * Reset css for all nodes.
     */
    var clearHighlighting = function () {
        d3.selectAll(".hNode, .hLink").style("display", "none");
    };

    /**
     * Get predecessing nodes for highlighting the path by the current node selection.
     * @param nodeId An Integer id for the node.
     * @param highlighted A Boolean flag whether path should be highlighted or not.
     */
    var highlightPredPath = function (nodeId, highlighted) {
        /* Get svg link element, and for each predecessor call recursively. */
        nodeLinkPredMap[nodeId].forEach(function (l) {
            d3.select("#hLinkId-" + l).style("display", "inline");
            highlightPredPath(links[l].source.id, highlighted);
        });
    };

    /**
     * Get succeeding nodes for highlighting the path by the current node selection.
     * @param nodeId An Integer id for the node.
     * @param highlighted A Boolean flag whether path should be highlighted or not.
     */
    var highlightSuccPath = function (nodeId, highlighted) {
        /* Get svg link element, and for each successor call recursively. */
        nodeLinkSuccMap[nodeId].forEach(function (l) {
            d3.select("#hLinkId-" + l).style("display", "inline");
            highlightSuccPath(links[l].target.id, highlighted);
        });
    };

    /**
     * Draw links.
     */
    var drawLinks = function () {
        link = vis.canvas.append("g").classed({"links": true}).selectAll(".link")
            .data(links.filter(function (l) {
                return l !== null && typeof l !== "undefined";
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(l.source.x, 10) + "," + parseInt(l.source.y, 10);
                if (Math.abs(l.source.x - l.target.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.source.x + (cell.width)) + "," + parseInt(l.target.y, 10) + " H" + parseInt(l.target.x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.target.x, 10) + "," + parseInt(l.target.y, 10));
                }
                return pathSegment;
            })
            .classed({
                "link": true
            })
            .style("opacity", 0.0)
            .attr("id", function (l) {
                return "linkId-" + l.id;
            }).style("display", function (l) {
                return l.hidden ? "none" : "inline";
            });

        /* TODO: FIX: in certain cases, tooltips collide with canvas bounding box */
        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (l) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + l.id + "</span><br>" +
                    "<strong>Source Id:</strong> <span style='color:#fa9b30'>" + l.source.id + "</span><br>" +
                    "<strong>Target Id:</strong> <span style='color:#fa9b30'>" + l.target.id + "</span>";
            });

        /* Invoke tooltip on dom element. */
        link.call(tip);
        link.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw sub-analysis nodes.
     */
    var drawSubanalysisNodes = function () {
        analysis.each(function (d, i) {
            d3.select(this).selectAll(".saNode")
                .data(saNodes.filter(function (san) {
                    return san.parent.id == -i - 1;
                }))
                .enter().append("g").each(function (san) {
                    d3.select(this).classed({"saNode": true})
                        .attr("transform", "translate(" + san.x + "," + san.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + san.id;
                        })
                        .style("display", function () {
                            return san.hidden ? "none" : "inline";
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-vis.radius) + " " +
                                (vis.radius) + "," + (-vis.radius / 2) + " " +
                                (vis.radius) + "," + (vis.radius / 2) + " " +
                                "0" + "," + (vis.radius) + " " +
                                (-vis.radius) + "," + (vis.radius / 2) + " " +
                                (-vis.radius) + "," + (-vis.radius / 2);
                        })
                        .style("fill", function () {
                            return vis.color(san.parent.uuid);
                        })
                        .style("stroke", function () {
                            return vis.color(analysisWorkflowMap[san.parent.uuid]);
                        })
                        .style("stroke-width", 2);
                });
        });

        /* Set node dom element. */
        saNode = d3.selectAll(".saNode");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span>";
            });

        /* Invoke tooltip on dom element. */
        saNode.call(tip);
        saNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw analysis nodes.
     */
    var drawAnalysisNodes = function () {
        analysis.each(function (d, i) {
            d3.select(this).selectAll(".aNode")
                .data(aNodes.filter(function (an) {
                    return an.id == -i - 1;
                }))
                .enter().append("g").each(function (an) {
                    d3.select(this).classed({"aNode": true})
                        .attr("transform", "translate(" + an.x + "," + an.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + an.id;
                        })
                        .style("display", function () {
                            return an.hidden ? "none" : "inline";
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-2 * vis.radius) + " " +
                                (2 * vis.radius) + "," + (-vis.radius) + " " +
                                (2 * vis.radius) + "," + (vis.radius) + " " +
                                "0" + "," + (2 * vis.radius) + " " +
                                (-2 * vis.radius) + "," + (vis.radius) + " " +
                                (-2 * vis.radius) + "," + (-vis.radius);
                        })
                        .style("fill", function () {
                            return vis.color(an.uuid);
                        })
                        .style("stroke", function () {
                            return vis.color(analysisWorkflowMap[an.uuid]);
                        })
                        .style("stroke-width", 3);
                });
        });

        /* Set node dom element. */
        aNode = d3.selectAll(".aNode");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return d.id === -1 ? "<span style='color:#fa9b30'>Original dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Start:</strong> <span style='color:#fa9b30'>" + d.start + "</span><br>" +
                    "<strong>End:</strong> <span style='color:#fa9b30'>" + d.end + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span>";
            });

        /* Invoke tooltip on dom element. */
        aNode.call(tip);
        aNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw nodes.
     */
    var drawNodes = function () {
        analysis.each(function (a, i) {
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return n.analysis === nodes[-i - 1].uuid;
                }))
                .enter().append("g").style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                }).each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", vis.radius);
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - vis.radius) + "," + (d.y - vis.radius) + ")")
                                .append("rect")
                                .attr("width", vis.radius * 2)
                                .attr("height", vis.radius * 2);
                        } else if (d.nodeType === "dt") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - vis.radius * 0.75) + "," + (d.y - vis.radius * 0.75) + ")")
                                .append("rect")
                                .attr("width", vis.radius * 1.5)
                                .attr("height", vis.radius * 1.5)
                                .attr("transform", function () {
                                    return "rotate(45 " + (vis.radius * 0.75) + "," + (vis.radius * 0.75) + ")";
                                });
                        }
                    }
                }).attr("class", function (d) {
                    return "node " + d.nodeType + "Node";
                })
                .attr("id", function (d) {
                    return "nodeId-" + d.id;
                });
        });

        /* Set node dom element. */
        node = d3.selectAll(".node");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Name:</strong> <span style='color:#fa9b30'>" + d.name + "</span><br>" +
                    "<strong>Sub Analysis:</strong> <span style='color:#fa9b30'>" + d.subanalysis + "</span><br>" +
                    "<strong>Sub Analysis Id:</strong> <span style='color:#fa9b30'>" + d.parent.id + "</span><br>" +
                    "<strong>Analysis Id:</strong> <span style='color:#fa9b30'>" + d.parent.parent.id + "</span><br>" +
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>RowBK left:</strong> <span style='color:#fa9b30'>" + d.rowBK.left + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span><br>" +
                    "<strong>BCOrder:</strong> <span style='color:#fa9b30'>" + d.bcOrder + "</span>";
            });

        /* Invoke tooltip on dom element. */
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /* TODO: IN PROGRESS. */
    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     */
    var handleCollapseExpandAnalysis = function () {
        d3.selectAll(".node, .saNode, .aNode").on("dblclick", function () {

            var hideChildNodes = function (n) {
                n.children.forEach(function (cn) {
                    cn.hidden = true;
                    d3.select("#nodeId-" + cn.id).style("display", "none");
                    if (typeof cn.children !== "undefined")
                        hideChildNodes(cn);
                });
            };

            var selNode = nodes[+d3.select(this).attr("id").replace(/(nodeId-)/g, "")],
                nodeType = selNode.nodeType,
                nodeId = selNode.id;

            /* Expand. */
            if (d3.event.ctrlKey && (nodeType === "analysis" || nodeType === "subanalysis")) {

                /* Set node visibility. */
                d3.select("#nodeId-" + selNode.id).style("display", "none");
                selNode.hidden = true;
                selNode.children.forEach(function (n) {
                    d3.select("#nodeId-" + n.id).style("display", "inline");
                    n.hidden = false;
                });

                /* Set link visibility. */
                if (nodeType === "subanalysis") {
                    selNode.links.forEach(function (l) {
                        d3.select("#linkId-" + l.id).style("display", "inline");
                        d3.select("#hLinkId-" + l.id).style("display", "inline");
                    });
                }
                selNode.inputs.forEach(function (sain) {
                    nodeLinkPredMap[sain.id].forEach(function (l) {
                        d3.select("#linkId-" + links[l].id).style("display", "inline");
                        d3.select("#hLinkId-" + links[l].id).style("display", "inline");
                        links[l].hidden = false;
                    });
                });

                /* Update connections. */
                selNode.children.forEach(function (cn) {
                    updateNode(d3.select("#nodeId-" + cn.id), cn, cn.x, cn.y);
                    updateLink(d3.select("#nodeId-" + cn.id), cn, cn.x, cn.y);
                });

            } else if (d3.event.shiftKey && nodeType !== "analysis") {
                /* Collapse. */

                /* Set node visibility. */
                selNode.parent.hidden = false;
                d3.select("#nodeId-" + selNode.parent.id).style("display", "inline");
                hideChildNodes(selNode.parent);

                /* Set link visibility. */
                selNode.parent.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "none");
                    d3.select("#hLinkId-" + l.id).style("display", "none");
                });
                selNode.parent.inputs.forEach(function (sain) {
                    nodeLinkPredMap[sain.id].forEach(function (l) {
                        d3.select("#linkId-" + links[l].id).style("display", "inline");
                        d3.select("#hLinkId-" + links[l].id).style("display", "inline");
                        links[l].hidden = false;
                    });
                });

                /* Update connections. */
                updateNode(d3.select("#nodeId-" + selNode.parent.id), selNode.parent, selNode.parent.x, selNode.parent.y);
                updateLink(d3.select("#nodeId-" + selNode.parent.id), selNode.parent, selNode.parent.x, selNode.parent.y);
            }

        });
    };

    /**
     * Path highlighting.
     */
    var handlePathHighlighting = function () {
        d3.selectAll(".node, .aNode, .saNode").on("click", function (x) {

            if (d3.event.ctrlKey || d3.event.shiftKey) {
                var highlighted = true;

                /* Suppress after dragend. */
                if (d3.event.defaultPrevented) return;

                /* Clear any highlighting. */
                clearHighlighting();

                /* TODO: Create CSS-classes for highlighted cells to manipulate on highlighting. */
                if (d3.event.ctrlKey) {

                    /* Highlight path. */
                    highlightSuccPath(x.id, highlighted);
                } else if (d3.event.shiftKey) {

                    /* Highlight path. */
                    highlightPredPath(x.id, highlighted);
                }
            }
        });
    };

    /**
     * Fit visualization onto free windows space.
     * @param transitionTime The time in milliseconds for the duration of the animation.
     */
    var fitGraphToWindow = function (transitionTime) {
        var min = [d3.min(nodes, function (d) {
                return d.x - vis.margin.left;
            }), d3.min(nodes, function (d) {
                return d.y - vis.margin.top;
            })],
            max = [d3.max(nodes, function (d) {
                return d.x + vis.margin.right;
            }), d3.max(nodes, function (d) {
                return d.y + vis.margin.bottom;
            })],
            delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(vis.width / delta[0]), (height / delta[1])],
        /* Maximize scale to factor 3. */
            newScale = d3.min(factor.concat([3])),
            newPos = [((vis.width - delta[0] * newScale) / 2),
                ((height - delta[1] * newScale) / 2)];

        newPos[0] -= min[0] * newScale;
        newPos[1] -= min[1] * newScale;

        if (transitionTime !== 0) {
            vis.canvas
                .transition()
                .duration(1000)
                .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        } else {
            vis.canvas.attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        }

        vis.zoom.translate(newPos);
        vis.zoom.scale(newScale);

        /* Background rectangle fix. */
        vis.rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," + (-newPos[1] / newScale) + ")" + " scale(" + (+1 / newScale) + ")");
    };

    /**
     * Wrapper function to invoke scale and transformation onto the visualization.
     */
    var handleFitGraphToWindow = function () {
        fitGraphToWindow(1000);
    };

    /* TODO: BUG: On double click, single-click action still is executed. */
    /**
     * Click and double click separation on background rectangle.
     */
    var handleBRectClick = function () {
        var clickInProgress = false, /* click in progress. */
            timer = 0,
            bRectAction = clearHighlighting;
        /* default action. */
        d3.selectAll(".brect, .cell").on("click", function () {

            /* Suppress after drag end. */
            if (d3.event.defaultPrevented) return;

            /* If double click, break. */
            if (clickInProgress) {
                return;
            }
            clickInProgress = true;

            /* Single click event is called after timeout unless a dblclick action is performed. */
            timer = setTimeout(function () {
                bRectAction();

                /* Called every time. */
                bRectAction = clearHighlighting;

                /* Set back click action to single. */
                clickInProgress = false;
            }, 200);
            /* Timeout value. */
        });

        /* if double click, the single click action is overwritten. */
        d3.selectAll(".brect, .cell").on("dblclick", function () {
            bRectAction = handleFitGraphToWindow;
        });
    };

    /**
     * Draws a grid for the grid-based graph layout.
     *
     * @param grid An array containing cells.
     */
    var drawGrid = function (grid) {
        gridCell = vis.canvas.append("g").classed({"cells": true}).selectAll(".cell")
            .data(function () {
                return [].concat.apply([], grid);
            })
            .enter().append("rect")
            .attr("x", function (d, i) {
                return -cell.width / 2 - parseInt(i / vis.graph.width, 10) * cell.width;
            })
            .attr("y", function (d, i) {
                return -cell.height / 2 + (i % vis.graph.width) * cell.height;
            })
            .attr("width", cell.width)
            .attr("height", cell.height)
            .attr("fill", "none")
            .attr("stroke", "lightgray")
            .classed({
                "cell": true
            })
            .style("opacity", 0.7)
            .attr("id", function (d, i) {
                return "cellId-" + parseInt(i / vis.graph.width, 10) + "-" + (i % vis.graph.width);
            });
    };

    /**
     * Draw simple node/link highlighting shapes.
     */
    var drawHighlightingShapes = function () {

        hLink = vis.canvas.append("g").classed({"hLinks": true}).selectAll(".hLink")
            .data(links.filter(function (l) {
                return l !== null && typeof l !== "undefined";
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(l.source.x, 10) + "," + parseInt(l.source.y, 10);
                if (Math.abs(l.source.x - l.target.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.source.x + (cell.width)) + "," + parseInt(l.target.y, 10) + " H" + parseInt(l.target.x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.target.x, 10) + "," + parseInt(l.target.y, 10));
                }
                return pathSegment;
            })
            .classed({
                "hLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.id;
            }).style("stroke", function (d) {
                return vis.color(analysisWorkflowMap[d.target.analysis]);
            });


        hNode = vis.canvas.append("g").classed({"hNodes": true}).selectAll(".hNode")
            .data(nodes)
            .enter().append("g")
            .attr("transform", function (d) {
                return "translate(" + (d.x - cell.width / 2) + "," + (d.y - cell.height / 2) + ")";
            })
            .append("rect")
            .attr("width", cell.width)
            .attr("height", cell.height)
            .classed({"hNode": true})
            .attr("id", function (d) {
                return "hNodeId-" + d.id;
            }).style("fill", function (d) {
                return vis.color(analysisWorkflowMap[d.analysis]);
            });
    };

    /**
     * Handle event listeners.
     */
    var handleEvents = function () {

        /* Path highlighting. */
        handlePathHighlighting();

        /* Handle click separation. */
        handleBRectClick();

        /* TODO: Minimize layout through minimizing analyses - adapt to collapse/expand. */
        /* Handle analysis aggregation. */
        handleCollapseExpandAnalysis();

        /* TODO: On click on node, enlarge shape to display more info. */
    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for analysis only nodes.
     */
    var initAnalysisLayout = function () {
        var firstLayer = 0;

        aNodes.forEach(function (an) {
            var rootCol;

            if (an.succs.length > 0) {
                rootCol = an.succs[0].inputs[0].col;

                an.succs.forEach(function (san) {
                    if (typeof san !== "undefined" && san !== null) {
                        san.inputs.forEach(function (sanIn) {
                            if (sanIn.col + 1 > rootCol) {
                                rootCol = sanIn.col + 1;
                            }
                        });
                    }
                });
            } else {
                if (an.outputs.length > 0) {
                    rootCol = an.outputs[0].col;
                } else {
                    an.col = firstLayer;
                }
            }

            an.col = rootCol;
            an.x = -an.col * cell.width;
            an.row = an.outputs.map(function (aon) {
                return aon.row;
            })[parseInt(an.outputs.length / 2, 10)];
            an.y = an.row * cell.height;
        });
    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for sub-analysis only nodes.
     */
    var initSubanalysisLayout = function () {
        var firstLayer = 0;
        saNodes.forEach(function (san) {
            var rootCol;

            if (san.succs.length > 0) {
                rootCol = san.succs[0].inputs[0].col;

                san.succs.forEach(function (sasn) {
                    if (typeof sasn !== "undefined" && sasn !== null) {
                        sasn.inputs.forEach(function (sasnIn) {
                            if (sasnIn.col + 1 > rootCol) {
                                rootCol = sasnIn.col + 1;
                            }
                        });
                    }
                });
            } else {
                if (san.outputs.length > 0) {
                    rootCol = san.outputs[0].col;
                } else {
                    san.col = firstLayer;
                }
            }

            san.col = rootCol;
            san.x = -san.col * cell.width;
            san.row = san.outputs.map(function (aon) {
                return aon.row;
            })[parseInt(san.outputs.length / 2, 10)];
            san.y = san.row * cell.height;
        });
    };

    /**
     * Set coordinates for nodes.
     */
    var assignCellCoords = function () {
        nodes.forEach(function (d) {
            d.x = -d.col * cell.width;
            d.y = d.row * cell.height;
        });
    };

    /**
     * Creates analysis group dom elements which then contain the nodes and links of an analysis.
     */
    var createAnalysisLayers = function () {
        var aId = -1;

        /* Add analyses dom groups. */
        aNodes.forEach(function () {
            vis.canvas.append("g")
                .classed("analysis", true)
                .attr("id", function () {
                    return "aId-" + aId;
                });
            aId--;
        });
        analysis = d3.selectAll(".analysis");
    };

    var runRenderPrivate = function (provVis) {
        /* Save vis object to module scope. */
        vis = provVis;
        cell = {width: vis.radius * 3, height: vis.radius * 3};

        nodes = vis.graph.nodes;
        links = vis.graph.links;
        iNodes = vis.graph.iNodes;
        oNodes = vis.graph.oNodes;
        aNodes = vis.graph.aNodes;
        saNodes = vis.graph.saNodes;
        nodeMap = vis.graph.nodeMap;
        nodePredMap = vis.graph.nodePredMap;
        nodeSuccMap = vis.graph.nodeSuccMap;
        nodeLinkPredMap = vis.graph.nodeLinkPredMap;
        nodeLinkSuccMap = vis.graph.nodeLinkSuccMap;
        analysisWorkflowMap = vis.graph.analysisWorkflowMap;
        width = vis.graph.width;
        depth = vis.graph.depth;
        grid = vis.graph.grid;

        /* Short delay. */
        setTimeout(function () {

            /* Set coordinates for nodes. */
            assignCellCoords();

            /* Draw grid. */
            drawGrid(vis.graph.grid);

            /* Draw simple node/link highlighting shapes. */
            drawHighlightingShapes();

            /* Draw links. */
            drawLinks();

            /* Create analysis group layers. */
            createAnalysisLayers();

            /* Draw nodes. */
            drawNodes();

            /* Create initial layout for sub-analysis only nodes. */
            initSubanalysisLayout();

            /* Draw sub-analysis nodes. */
            drawSubanalysisNodes();

            /* Create initial layout for analysis only nodes. */
            initAnalysisLayout();

            /* Draw analysis nodes. */
            drawAnalysisNodes();

            /* Set initial graph position. */
            fitGraphToWindow(0);

            /* Colorize graph. */
            dyeWorkflows();
            dyeAnalyses();

            /* Add dragging behavior to nodes. */
            applyDragBehavior();

            /* Add dragging behavior to analysis nodes. */
            applyAnalysisDragBehavior();

            /* Add dragging behavior to sub-analysis nodes. */
            applySubanalysisDragBehavior();

            /* Event listeners. */
            $(function () {
                handleEvents();
            });

            /* Fade in. */
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);

        vis.graph.nodes = nodes;
        vis.graph.links = links;
        vis.graph.iNodes = iNodes;
        vis.graph.oNodes = oNodes;
        vis.graph.aNodes = aNodes;
        vis.graph.saNodes = saNodes;
        vis.graph.nodeMap = nodeMap;
        vis.graph.nodePredMap = nodePredMap;
        vis.graph.nodeSuccMap = nodeSuccMap;
        vis.graph.nodeLinkPredMap = nodeLinkPredMap;
        vis.graph.nodeLinkSuccMap = nodeLinkSuccMap;
        vis.graph.analysisWorkflowMap = analysisWorkflowMap;
        vis.graph.width = width;
        vis.graph.depth = depth;
        vis.graph.grid = grid;
    };

    /**
     * Publish module function.
     */
    return{
        runRender: function (vis) {
            runRenderPrivate(vis);
        }
    };
}();