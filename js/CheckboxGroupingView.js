Ext.ux.CheckboxGroupingView = Ext.extend(Ext.grid.GroupingView, {
    initTemplates: function() {
        this.startGroup = new Ext.XTemplate(
            '<div id="{groupId}" class="x-grid-group {cls}">',
                '<div id="{groupId}-hd" class="x-grid-group-hd" style="{style}">',
                    '<div class="x-grid-group-title">', Ext.grid.GroupingView.prototype.groupTextTpl ,'</div>',
                    '<div class="x-grid3-row-checker"> </div>',
                '</div>',
            '<div id="{groupId}-bd" class="x-grid-group-body">'
        ).compile();
        Ext.ux.CheckboxGroupingView.superclass.initTemplates.apply(this, arguments);
    },

    init: function() {
        Ext.ux.CheckboxGroupingView.superclass.init.apply(this, arguments);
        Ext.apply(this, {
            hideGroupedColumn: true,
            showGroupName: false,
            enableGroupingMenu: false,
            forceFit: true
        });
        this.grid.selModel = new Ext.grid.CheckboxSelectionModel({
            checkOnly: true,
            listeners: {
                rowselect: this.onRowSelectDeselect,
                rowdeselect: this.onRowSelectDeselect,
                scope: this
            }
        });
        this.grid.colModel.config.push(this.grid.selModel);
    },

    onRowSelectDeselect: function(sm, rowIndex, rec) {

//      Ignore if we are programmatically selecting elsewhere
        if (this.ignoreSelectionChange) {
            return;
        }
        var rowEl = this.getRow(rowIndex);
        var groupEl = Ext.get(rowEl).findParent('.x-grid-group', this.mainBody.dom, true);
        var recs = this.getGroupRecords(groupEl);
        var allSelected = true;
        var selCount = 0;
        for (var i = 0; i < recs.length; i++) {
            if (sm.isSelected(recs[i])) {
                selCount++;
            } else {
                allSelected = false;
            }
        }
        if (allSelected) {
            groupEl.child('.x-grid-group-hd').removeClass('x-grid3-row-half-checked').addClass('x-grid3-row-checked');
        } else if (selCount) {
            groupEl.child('.x-grid-group-hd').addClass(['x-grid3-row-checked', 'x-grid3-row-half-checked']);
        } else {
            groupEl.child('.x-grid-group-hd').removeClass(['x-grid3-row-checked', 'x-grid3-row-half-checked']);
        }
    },

    getGroupRecords: function(groupValue) {
        if (!Ext.isString(groupValue)) {
            var el = Ext.get(groupValue).findParent('.x-grid-group');
            groupValue = el.id.substring(el.id.lastIndexOf('-') + 1);
        }
        return this.grid.store.query(this.getGroupField(), groupValue).items;
    },

    interceptMouse: function(e) {
        var hd = e.getTarget('.x-grid-group-hd', this.mainBody);
        if(hd){
            e.stopEvent();

//          Checkbox click
            if (e.getTarget('.x-grid3-row-checker')) {
                var el = Ext.get(hd);

                hd = hd.parentNode;
                var groupValue = hd.id.substring(hd.id.lastIndexOf('-') + 1),
                    s = this.grid.store,
                    recs = s.query(this.getGroupField(), groupValue).items,
                    sm = this.grid.getSelectionModel();

//              Ignore row selection/deselection that we do programmatically
                this.ignoreSelectionChange = true;

//              Buffer any updates until the group has been toggled.
                sm.suspendEvents();

                if (el.hasClass('x-grid3-row-checked') && !el.hasClass('x-grid3-row-half-checked')) {
                    el.removeClass('x-grid3-row-checked');
                    for (var i = 0; i < recs.length; i++) {
                        sm.deselectRow(s.indexOf(recs[i]));
                    }
                } else {
                    el.addClass('x-grid3-row-checked').removeClass('x-grid3-row-half-checked');
                    sm.selectRecords(recs, true);
                }

                sm.resumeEvents();

//              Inform listeners other than us.
                sm.fireEvent("selectionchange", sm);

                this.ignoreSelectionChange = false;
                return;
            }

            this.toggleGroup(hd.parentNode);
        }
    }
});