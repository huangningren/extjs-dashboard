Ext.ns("Ext.ux");

//Add pdeudo-class ':element' to DomQuery's element selection filtering
Ext.DomQuery.pseudos.element = function(c){
    var r = [], ri = -1;
    for(var i = 0, ci; ci = c[i]; i++){
        if(ci.nodeType == 1){
            r[++ri] = ci;
        }
    }
    return r;
};

Ext.override(Ext.TabPanel, {
    onRender: Ext.TabPanel.prototype.onRender.createSequence(function() {
        this.edge.dom.innerHTML = '<span class="x-tab-strip-text">&#160;</span>';
    }),
    initTab: Ext.TabPanel.prototype.initTab.createSequence(function(item, index) {
        var el = Ext.get(this.getTabEl(index));
        el.child("a.x-tab-right").on("click", this.onStripMouseDown, this, {preventDefault: true});
    })
});

Ext.override(Ext.data.XmlReader, {
    buildExtractors : function() {
        if(this.ef){
            return;
        }
        var s       = this.meta,
            Record  = this.recordType,
            f       = Record.prototype.fields,
            fi      = f.items,
            fl      = f.length;

        if(s.totalProperty) {
            this.getTotal = this.createAccessor(s.totalProperty);
        }
        if(s.successProperty) {
            this.getSuccess = this.createAccessor(s.successProperty);
        }
        if (s.messageProperty) {
            this.getMessage = this.createAccessor(s.messageProperty);
        }
        this.getRoot = function(res) {
            return (!Ext.isEmpty(res[this.meta.record])) ? res[this.meta.record] : res[this.meta.root];
        }
        if (s.idPath || s.idProperty) {
            var g = this.createAccessor(s.idPath || s.idProperty);
            this.getId = function(rec) {
                var id = g(rec) || rec.id;
                return (id === undefined || id === '') ? null : id;
            };
        } else {
            this.getId = function(){return null;};
        }
        var ef = [];
        for(var i = 0; i < fl; i++){
            f = fi[i];
            var map = (f.mapping !== undefined && f.mapping !== null) ? f.mapping : f.name;
            ef.push(this.createAccessor(map, f.type));
        }
        this.ef = ef;
    },

    createAccessor : function(){
        var q = Ext.DomQuery;
        return function(key, type) {
            switch(key) {
                case this.meta.totalProperty:
                    return function(root, def){
                        return q.selectNumber(key, root, def);
                    }
                    break;
                case this.meta.successProperty:
                    return function(root, def) {
                        var sv = q.selectValue(key, root, true);
                        var success = sv !== false && sv !== 'false';
                        return success;
                    }
                    break;
                default:
                    return (type === 'element') ? function(root, def) {
                        return q.select(key, root, def);
                    } : function(root, def) {
                        return q.selectValue(key, root, def);
                    }
                    break;
            }
        };
    }()
});