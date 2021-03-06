/* TODO: Add a "Reset layout" to the toolbar. */

/**
 * Module for init.
 */
var provvisInit = function () {

    /* Initialize node-link arrays. */
    var dataset = Object.create(null),
        nodes = [],
        links = [],
        iNodes = [],
        oNodes = [],
        aNodes = [],
        saNodes = [],

        nodeMap = d3.map(),

        analysisWorkflowMap = d3.map(),
        workflowData = d3.map(),
        analysisData = d3.map(),
        nodeData = d3.map(),

        nodeAttributeList = [];

    /**
     * Assign node types.
     * @param n Current raw node.
     * @returns {string} The CSS class corresponding to the type of the node.
     */
    var assignNodeType = function (n) {
        var nodeType = "";

        switch (n.type) {
            case "Source Name":
            case "Sample Name":
            case "Assay Name":
                nodeType = "special";
                break;
            case "Data Transformation Name":
                nodeType = "dt";
                break;
            default:
                if (n.file_url === null) {
                    nodeType = "intermediate";
                } else {
                    nodeType = "stored";
                }
                break;
        }
        return nodeType;
    };

    /**
     * Extract node api properties.
     * @param n Node object.
     * @param type Dataset specified node type.
     * @param id Integer identifier for the node.
     * @returns {provvisDecl.Node} New Node object.
     */
    var createNode = function (n, type, id) {
        var study = (n.study !== null) ? n.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
            assay = (n.assay !== null) ? n.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
            parents = n.parents.map(function (y) {
                return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
            }),
            analysis = (n.analysis_uuid !== null) ? n.analysis_uuid : "dataset";

        return new provvisDecl.Node(id, type, Object.create(null), false, n.name, n.type, study, assay, parents, analysis, n.subanalysis, n.uuid, n.file_url);
    };

    /**
     * Extract nodes.
     * @param datasetJsonObj Analysis dataset of type JSON.
     */
    var extractNodes = function (datasetJsonObj) {
        d3.values(datasetJsonObj.value).forEach(function (n, i) {

            /* Assign class string for node types. */
            var nodeType = assignNodeType(n);

            /* Extract node properties from api and create Node. */
            var newNode = createNode(n, nodeType, i);
            nodes.push(newNode);

            /* Build node hash. */
            nodeMap.set(n.uuid, newNode);

            nodeData.set(n.uuid, n);
        });
    };

    /**
     * Extract link properties.
     * @param lId Integer identifier for the link.
     * @param source Source node object.
     * @param target Target node object.
     * @returns {provvisDecl.Link} New Link object.
     */
    var createLink = function (lId, source, target) {
        return new provvisDecl.Link(lId, source, target, false);
    };

    /**
     * Extract links.
     */
    var extractLinks = function () {
        var lId = 0;

        nodes.forEach(function (n, i) {
            if (typeof n.uuid !== "undefined") {
                if (typeof n.parents !== "undefined") {

                    /* For each parent entry. */
                    n.parents.forEach(function (puuid) { /* n -> target; p -> source */
                        if (typeof nodeMap.get(puuid) !== "undefined") {
                            /* ExtractLinkProperties. */
                            links.push(createLink(lId, nodeMap.get(puuid), n));
                            lId++;
                        } else {
                            console.log("ERROR: Dataset might be corrupt - parent: " + puuid + " of node with uuid: " + n.uuid + " does not exist.");
                        }
                    });
                } else {
                    console.log("Error: Parents array of node with uuid: " + n.uuid + " is undefined!");
                }
            } else {
                console.log("Error: Node uuid is undefined!");
            }
        });
    };

    /**
     * For each node, set pred nodes, succ nodes, predLinks links as well as succLinks links.
     */
    var createNodeLinkMapping = function () {
        links.forEach(function (l) {
            l.source.succs.set(l.target.autoId, l.target);
            l.source.succLinks.set(l.autoId, l);
            l.target.preds.set(l.source.autoId, l.source);
            l.target.predLinks.set(l.autoId, l);
        });

        /* Set input and output nodes. */
        nodes.forEach(function (n) {
            if (n.succs.empty()) {

                /* Set output nodes. */
                oNodes.push(n);
            } else if (n.preds.empty()) {

                /* Set input nodes. */
                iNodes.push(n);
            }
        });
    };

    /**
     * Divide analyses into independent subanalyses.
     */
    var markSubanalyses = function () {
        var subanalysis = 0;

        /**
         * Traverse graph back when the node has two or more predecessors.
         * @param n Current node.
         * @param subanalysis Current subanalysis.
         */
        var traverseBackSubanalysis = function (n, subanalysis) {
            n.subanalysis = subanalysis;
            n.preds.values().forEach(function (pn) {
                if (pn.subanalysis === null) {
                    traverseBackSubanalysis(pn, subanalysis);
                }
            });
        };

        /**
         * Traverse graph in a DFS fashion.
         * @param n Current node.
         * @param subanalysis Current subanalysis.
         */
        var traverseDataset = function (n, subanalysis) {
            n.subanalysis = subanalysis;

            if (n.preds.size() > 1) {
                n.preds.values().forEach(function (pn) {
                    if (pn.subanalysis === null) {
                        traverseBackSubanalysis(pn, subanalysis);
                    }
                });
            }

            n.succs.values().forEach(function (sn) {
                if (sn.analysis !== "dataset") {
                    if (sn.subanalysis === null) {
                        if (!sn.succs.empty()) {
                            subanalysis = sn.succs.values()[0].subanalysis;
                        }
                    } else {
                        subanalysis = sn.subanalysis;
                    }
                }
                traverseDataset(sn, subanalysis);
            });
        };

        /* For each subanalysis in the dataset. */
        iNodes.forEach(function (n) {
            /* Processed nodes are set to "null" after parsing nodes. */
            if (n.subanalysis === null) {

                traverseDataset(n, subanalysis);
                subanalysis++;
            }
        });
    };

    /**
     * Create analysis node.
     * @param a Analysis.
     * @param i Index.
     * @returns {provvisDecl.Analysis} New Analysis object.
     */
    var createAnalysisNode = function (a, i) {
        return new provvisDecl.Analysis(i, Object.create(null), true, a.uuid,
            a.workflow__uuid, i, a.time_start, a.time_end, a.creation_date);
    };

    /**
     * Extracts workflow uuid with its workflow data.
     * @param analysesData analyses object extracted from global refinery variable.
     */
    var extractWorkflows = function (analysesData) {

        analysesData.forEach(function (a) {

            /* Prepare for json format. */
            var prepareJSON = function (wfCpy) {
                var text = wfCpy.replace(/u'/g, "\"");
                text = text.replace(/\'/g, "\"");
                text = text.replace(/\sNone/g, " \"None\"");
                text = text.replace(/\\/g, "");
                text = text.replace(/\"{\"/g, "{\"");
                text = text.replace(/}\"/g, "}");
                text = text.replace(/\"\"(\S+)\"\"/g, "\"$1\"");

                /* Eliminate __xxxx__ parameters. */
                text = text.replace(/\"__(\S*)__\":\s{1}\d*(,\s{1})?/g, "");
                text = text.replace(/,\s{1}null/g, "");
                text = text.replace(/,\s{1}}/g, "}");

                return text;
            };

            /* Transform to JSON object. */
            var text = prepareJSON(a.workflow_copy);
            var wfData = JSON.parse(text);
            var wfObj = wfData;
            workflowData.set(a.workflow__uuid, wfObj);
        });
    };

    /**
     * Extracts analyses nodes as well as maps it to their corresponding workflows.
     * @param analysesData analyses object extracted from global refinery variable.
     */
    var extractAnalyses = function (analysesData) {

        /* Datasets have no date information. */
        var initDate = new Date(0);
        if (analysesData.length > 0) {
            initDate = d3.min(analysesData, function (d) {
                return new Date(d.time_start);
            });
        }

        /* Create analysis for dataset. */
        dataset = new provvisDecl.Analysis(0, Object.create(null), true, "dataset", "dataset",
            0, initDate, initDate, initDate);
        aNodes.push(dataset);
        analysisWorkflowMap.set("dataset", "dataset");

        /* Create remaining analyses. */
        analysesData.forEach(function (a, i) {
            aNodes.push(createAnalysisNode(a, i + 1));
            analysisWorkflowMap.set(a.uuid, a.workflow__uuid);
            analysisData.set(a.uuid, a);
        });
    };

    /**
     * Create subanalysis node.
     * @param sanId Subanalysis id.
     * @param an Analysis.
     * @param subanalysis
     * @returns {provvisDecl.Subanalysis} New Subanalysis object.
     */
    var createSubanalysisNode = function (sanId, an, subanalysis) {
        return new provvisDecl.Subanalysis(sanId, an, true, subanalysis);
    };

    /**
     * For each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it.
     */
    var createAnalysisNodeMapping = function () {

        /* Subanalysis. */

        /* Create subanalysis node. */
        var sanId = 0;
        aNodes.forEach(function (an) {
            nodes.filter(function (n) {
                return n.analysis === an.uuid;
            }).forEach(function (n) {
                if (!an.children.has(n.subanalysis)) {
                    var san = createSubanalysisNode(sanId, an, n.subanalysis);
                    saNodes.push(san);
                    an.children.set(n.subanalysis, san);
                    sanId++;
                }
            });
        });

        saNodes.forEach(function (san) {

            /* Set child nodes for subanalysis. */
            nodes.filter(function (n) {
                return san.parent.uuid === n.analysis && n.subanalysis === san.subanalysis;
            }).forEach(function (cn) {
                san.children.set(cn.autoId, cn);
            });

            /* Set subanalysis parent for nodes. */
            san.children.values().forEach(function (n) {
                n.parent = san;
            });

            /* Set input nodes for subanalysis. */
            san.children.values().filter(function (n) {
                return n.preds.values().some(function (p) {
                    return p.analysis !== san.parent.uuid;
                }) || n.preds.empty();
                /* If no src analyses exists. */
            }).forEach(function (inn) {
                san.inputs.set(inn.autoId, inn);
            });

            /* Set output nodes for subanalysis. */
            san.children.values().filter(function (n) {
                return n.succs.empty() || n.succs.values().some(function (s) {
                    return s.analysis !== san.parent.uuid;
                });
            }).forEach(function (onn) {
                san.outputs.set(onn.autoId, onn);
            });
        });

        saNodes.forEach(function (san) {
            /* Set predecessor subanalyses. */
            san.inputs.values().forEach(function (n) {
                n.preds.values().forEach(function (pn) {
                    if (!san.preds.has(pn.parent.autoId)) {
                        san.preds.set(pn.parent.autoId, pn.parent);
                    }
                });
            });

            /* Set successor subanalyses. */
            san.outputs.values().forEach(function (n) {
                n.succs.values().forEach(function (sn) {
                    if (!san.succs.has(sn.parent.autoId)) {
                        san.succs.set(sn.parent.autoId, sn.parent);
                    }
                });
            });
        });

        /* Set link references for subanalyses. */
        saNodes.forEach(function (san) {
            san.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    san.predLinks.set(l.autoId, l);
                });
            });

            san.outputs.values().forEach(function (saon) {
                saon.succLinks.values().forEach(function (l) {
                    san.succLinks.set(l.autoId, l);
                });
            });
        });

        /* Set links for subanalysis. */
        saNodes.forEach(function (san) {
            links.filter(function (l) {
                return l !== null && san.parent.uuid === l.target.analysis && l.target.subanalysis === san.subanalysis;
            }).forEach(function (ll) {
                san.links.set(ll.autoId, ll);
            });
        });

        /* Analysis. */
        aNodes.forEach(function (an) {

            /* Children are set already. */
            an.children.values().forEach(function (san) {
                /* Set input nodes. */
                san.inputs.entries().forEach(function (sani) {
                    an.inputs.set(sani.key, sani.value);
                });

                /* Set output nodes. */
                san.outputs.entries().forEach(function (sano) {
                    an.outputs.set(sano.key, sano.value);
                });

                /* Set subanalysis wfUuid. */
                san.wfUuid = an.wfUuid;
            });
        });

        aNodes.forEach(function (an) {

            /* Set predecessor analyses. */
            an.children.values().forEach(function (san) {
                san.preds.values().forEach(function (psan) {
                    if (!an.preds.has(psan.parent.autoId)) {
                        an.preds.set(psan.parent.autoId, psan.parent);
                    }
                });
            });

            /* Set successor analyses. */
            an.children.values().forEach(function (san) {
                san.succs.values().forEach(function (ssan) {
                    if (!an.succs.has(ssan.parent.autoId)) {
                        an.succs.set(ssan.parent.autoId, ssan.parent);
                    }
                });
            });
        });

        /* Set links. */
        aNodes.forEach(function (an) {
            an.children.values().forEach(function (san) {
                san.links.values().forEach(function (sanl) {
                    an.links.set(sanl.autoId, sanl);
                });
            });
        });

        /* Set predLinks and succLinks. */
        aNodes.forEach(function (an) {
            an.inputs.values().forEach(function (ain) {
                ain.predLinks.values().forEach(function (l) {
                    an.predLinks.set(l.autoId, l);
                });
            });
            an.outputs.values().forEach(function (aon) {
                aon.succLinks.values().forEach(function (l) {
                    an.succLinks.set(l.autoId, l);
                });
            });
        });
    };

    /* TODO: Only extract attributes relevant to the filter attributes. */
    /**
     * Temporarily facet node attribute extraction.
     * @param solrResponse Facet filter information on node attributes.
     */
    var extractFacetNodeAttributesPrivate = function (solrResponse) {
        if (solrResponse instanceof SolrResponse) {
            solrResponse.getDocumentList().forEach(function (d) {

                /* Set facet attributes to all nodes for the subanalysis of the selected node. */
                var selNode = nodeMap.get(d.uuid);

                var rawFacetAttributes = d3.entries(d);

                rawFacetAttributes.forEach(function (fa) {
                    var attrNameEndIndex = fa.key.indexOf("_Characteristics_"),
                        attrName = "";

                    if (attrNameEndIndex === -1) {
                        attrName = fa.key.replace(/REFINERY_/g, "");
                        attrName = attrName.replace(/_2_1_s/g, "");
                        attrName = attrName.toLowerCase();

                        /* Temporary FileType field fix. */
                        if (attrName === "filetype") {
                            attrName = "FileType";
                        }
                    } else {
                        attrName = fa.key.substr(0, attrNameEndIndex);
                    }

                    selNode.attributes.set(attrName, fa.value);
                });
            });
        }
    };

    /**
     * Add face node attributes to dropdown button menu in toolbar.
     * @param solrResponse Facet filter information on node attributes.
     */
    var createFacetNodeAttributeList = function (solrResponse) {

        /* Extract attributes. */
        if (solrResponse instanceof SolrResponse && solrResponse.getDocumentList().length > 0) {

            var sampleNode = solrResponse.getDocumentList()[0];
            var rawAttrSet = d3.entries(sampleNode);

            rawAttrSet.forEach(function (fa) {
                var attrNameEndIndex = fa.key.indexOf("_Characteristics_"),
                    attrName = "";

                if (attrNameEndIndex === -1) {
                    attrName = fa.key.replace(/REFINERY_/g, "");
                    attrName = attrName.replace(/_2_1_s/g, "");
                    attrName = attrName.toLowerCase();

                    /* Temporary FileType field fix. */
                    if (attrName === "filetype") {
                        attrName = "FileType";
                    }
                } else {
                    attrName = fa.key.substr(0, attrNameEndIndex);
                }

                nodeAttributeList.push(attrName);
            });
        }

        /* Add to button dropdown list. */
        nodeAttributeList.forEach(function (na) {
            $("<li/>", {
                "id": "prov-ctrl-visible-attribute-list-" + na,
                "html": "<a href=\"#\" class=\"field-name\">" + "<label class=\"radio\">" + "<input type=\"radio\">" + na + "</label>" + "</a>"
            }).appendTo("#prov-ctrl-visible-attribute-list");
        });

        /* Initially set name attribute checked. */
        $("#prov-ctrl-visible-attribute-list-name").find("input").prop("checked", true);
    };

    /**
     * Main init module function.
     * @param data Dataset holding the information for nodes and links.
     * @param analysesData Collection holding the information for analysis - node mapping.
     * @param solrResponse Facet filter information on node attributes.
     * @returns {provvisDecl.ProvGraph} The main graph object of the provenance visualization.
     */
    var runInitPrivate = function (data, analysesData, solrResponse) {
        /* Extract raw objects. */
        var obj = d3.entries(data)[1];

        /* Create node collection. */
        extractNodes(obj, solrResponse);

        /* Create link collection. */
        extractLinks();

        /* Set preds, succs, and predLinks as well as succLinks. */
        createNodeLinkMapping();

        /* Create analysis nodes. */
        extractAnalyses(analysesData);

        /* Extract workflow information. */
        extractWorkflows(analysesData);

        /* Divide dataset and analyses into subanalyses. */
        markSubanalyses();

        /* Create analysis node mapping. */
        createAnalysisNodeMapping();

        /* Temporarily facet node attribute extraction. */
        extractFacetNodeAttributesPrivate(solrResponse);

        createFacetNodeAttributeList(solrResponse);

        /* Create graph. */
        return new provvisDecl.ProvGraph(dataset, nodes, links, iNodes, oNodes, aNodes, saNodes, analysisWorkflowMap, nodeMap, analysisData, workflowData, nodeData, 0, 0, []);
    };

    /**
     * Publish module function.
     */
    return{
        runInit: function (data, analysesData, solrResponse) {
            return runInitPrivate(data, analysesData, solrResponse);
        }
    };
}();