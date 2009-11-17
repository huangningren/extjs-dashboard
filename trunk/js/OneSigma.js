// Read our driving XML file.
Ext.Ajax.request({
    url: 'process-state.xml',
    success: buildUI,
    failure: displayError
});

function displayError() {
    Ext.onReady(function() {
        Ext.Msg.error("Server comms failure", "Could not load process data<br>Please contact support");
    });
}

function buildUI(xhr, options) {

    var dq = Ext.DomQuery,

        verticalHeaders = false,

        metricColumnWidth = 80,

        dateOutputFormat = 'd/m/Y',

        selectedProcesses = {},

        metricStatusClass = [ 'metric-status-0', 'metric-status-1', 'metric-status-2', 'metric-status-3' ],

        verticalHcellTemplate = new Ext.Template(
            '<td class="x-grid3-hd x-grid3-cell x-grid3-td-{id} x-grid3-hd-{id} {css}" style="{style}" {tooltip} {attr} unselectable="on" style="{istyle}">',
            '<div class="vertical-header">{value}</div>',
            '</td>'
        ).compile();

        ProcessStateRecord = null,

        processStateStore = null,

        doc = xhr.responseXML,
        root = doc.documentElement || doc,

        processGrids = createProcessGrids(root),

        processSelectionStore = new Ext.data.GroupingStore({
            groupField: 'owner',
            sortInfo: { field: 'owner', direction: "ASC" },
            data: doc,
            reader: new Ext.data.XmlReader({
                record: "Process",
                idPath: "@Code"
            }, ProcessStateRecord)
        });

/*
    Create Record definition, column definitions and grids from the following cell format:
            <State Code="A1" Name="Organisation">
                <metric>381</metric>
                <status>1</status>
                <date>23/08/2009</date>
                <url>http://www.cisco.com</url>
            </State>

    Individual Fields are defined:
        { name: 'organization', mapping: 'States/State[Name=Organisation]', type: 'element', convert: convertMetricElement },

    Grid Columns are defined:
        { header: 'Organization', dataIndex: 'organization', width: 75, renderer: metricRenderer },
    
*/
    function createProcessGrids(root) {
        var processFields = [
                { name: 'code', mapping: '@Code' },
                { name: 'name', mapping: '@Name' },
                { name: 'owner', mapping: '@Owner' }
            ],
            grids = [],
            gridTitle = [],
            columns = [],
            processRec = dq.selectNode("Process", root),
            gridTypes = dq.select("/*:element", processRec);

//      Loop through grid types
        for (var i = 0; i < gridTypes.length; i++) {
            var gridDefinition = gridTypes[i],
                cells = dq.select("/*:element", gridDefinition);

            gridTitle[i] = gridDefinition.tagName;
            columns[i] = [
                { dataIndex: 'code', width: 75 },
                { dataIndex: 'name', width: 175, id: 'process-name-column' }
            ];

//          Loop through cells in each grid type collecting header and name data
            for (var j = 0; j < cells.length; j++) {
                var cell = cells[j],
                    header = dq.selectValue("@Name", cell),
                    name = createNameFromHeader(header);

                processFields.push({
                    name: name,
                    mapping: gridDefinition.tagName + '/' + cell.tagName + '[Name="' + header + '"]',
                    type: 'element',
                    convert: convertMetricElement
                });
                columns[i].push({
                    header: header,
                    dataIndex: name,
                    width: metricColumnWidth,
                    renderer: metricRenderer
                });
            }
        }

//      Create the Record definition for the driving Store
        ProcessStateRecord = Ext.data.Record.create(processFields);

//      Create the driving Store for the metric grids
        processStateStore = new Ext.data.Store({
            reader: new Ext.data.XmlReader({
                record: "Process",
                idPath: "@Code"
            }, ProcessStateRecord),
            data: root
        });

//      Nothing shown at first
        processStateStore.filterBy(function(){return false;});

        var viewConfig = {};
        if (verticalHeaders) {
            viewConfig.hcell = verticalHcellTemplate;
        }
        for (var i = 0; i < gridTypes.length; i++) {
            grids[i] = new Ext.grid.GridPanel({
                cls: verticalHeaders ? 'vertical-header-grid process-state-grid' : 'process-state-grid',
                columns: columns[i],
                columnLines: true,
                enableColumnMove: false,
                enableColumnResize: false,
                enableHdMenu: false,
                disableSelection: true,
                store: processStateStore,
                title: gridTitle[i],
                viewConfig: viewConfig,
                listeners: {
                    cellclick: function(grid, rowIndex, columnIndex, e) {
                        var record = grid.getStore().getAt(rowIndex);
                        var fieldName = grid.getColumnModel().getDataIndex(columnIndex);
                        var data = record.get(fieldName);
                        window.open(data.url);
                    }
                }
            });
        }

//      Unmask on first grid ready
        grids[0].on({
            viewready: Ext.Element.prototype.unmask,
            scope: Ext.getBody(),
            single: true
        });
        return grids;
    }

    function createNameFromHeader(h) {
        h = h.replace(/\s*/g,'');
        return h.substring(0, 1).toLowerCase() + h.substring(1);
    }

    function convertMetricElement(el) {
        var result = {
            metric: dq.selectValue('metric', el, ''),
            status: dq.selectNumber('status', el),
            //date: Date.parseDate(dq.selectValue('date', el), 'd/m/Y'),
            url: dq.selectValue('url', el)
        }
        return result;
    }

    function getQuickTip(v) {
        return 'Click to open ' + v.url;
    }

    function metricRenderer(v, metadata) {
        metadata.css = metricStatusClass[v.status];
        metadata.attr = 'qtip="' + getQuickTip(v) + '"';
        return '<div class="cell-metric-value">' +
            v.metric +
        '</div><div class="cell-date-value">' +
            (v.date ? v.date.format(dateOutputFormat) : '') +
        '</div>'
    }

    function onProcessSelectionChange(sm) {
        selectedProcesses = {};
        var sel = sm.getSelections();
        for (var i = 0; i < sel.length; i++) {
            selectedProcesses[sel[i].id] = true;
        }
        processStateStore.filterBy(processStateStoreFilter);
    }

    function processStateStoreFilter(rec, id) {
        return selectedProcesses[id];
    }

    var logoImg = Ext.getBody().createChild({
        tag: 'img',
        src: 'images/WSWlogo.jpg'
    });
    logoImg.on('load', function() {
        header.setHeight(logoImg.dom.offsetHeight + 10);
    }, null, {single: true});

    var header = new Ext.BoxComponent({
            id: 'onesigma-header',
            region: 'north',
            onRender : function() {
                Ext.BoxComponent.prototype.onRender.apply(this, arguments);
                this.el.dom.appendChild(logoImg.dom);
            },
            autoEl: {},
            margins: '0 0 5 0'
        }),

        navPanel = new Ext.grid.GridPanel({
            id: 'onesigma-menu',
            region: 'west',
            title: 'Processes',
            width: 300,
            split: true,
            collapsible: true,
            collapseMode: 'mini',
            store: processSelectionStore,
            columns: [
                { header: 'Name', dataIndex: 'name', id: 'process-name-column' },
                { header: 'Owner', dataIndex: 'owner' }
            ],
            hideHeaders: true,
            view: new Ext.ux.CheckboxGroupingView({
                startCollapsed: true
            }),
            margins: '0 0 5 5',
            listeners: {
                render: {
                    fn: function() {
                        navPanel.getSelectionModel().on({
                            selectionchange: onProcessSelectionChange
                        });
                    },
                    delay: 1
                },
                viewready: {
                    fn: function() {
                        var r = processSelectionStore.query('owner', processSelectionStore.getAt(0).get('owner'));
                        navPanel.getSelectionModel().selectRecords(r.items);
                    },
                    single: true
                }
            }
        }),

        mainTabPanel = new Ext.TabPanel({
            id: 'onesigma-main-tabpanel',
            region: 'center',
            items: processGrids,
            activeTab: 0,
            margins: '0 5 5 0'
        });

    Ext.onReady(function() {
        Ext.getBody().mask("Loading process data", "x-mask-loading");
        Ext.QuickTips.init();
        viewport = new Ext.Viewport({
            layout: 'border',
            items: [ header, navPanel, mainTabPanel ]
        });
    }, null, {delay: 200});
}