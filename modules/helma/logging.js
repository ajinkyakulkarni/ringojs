
var __shared__ = true;

(function() {

    require('core.string');
    import('helma.system', 'system');
    include('helma.buffer');

    export('getLogger');

    var configured = false;
    var responseLogEnabled = true;

    /**
     * Configure log4j using the given file resource.
     * Make sure to set the reset property to true in the <log4j:configuration> header
     * e.g. <log4j:configuration xmlns:log4j='http://jakarta.apache.org/log4j/' reset="true">
     */
    this.setConfig = function(resource) {
        var configurator = resource.endsWith('.properties') || resource.endsWith('.props') ?
                           org.apache.log4j.PropertyConfigurator :
                           org.apache.log4j.xml.DOMConfigurator;
        configurator.configure(resource);
        configurator.configureAndWatch(resource, 2000);
        configured = true;
    }

    /**
     * Get a logger for the given name.
     */
    this.getLogger = function(name) {
        if (!configured) {
            // getResource('foo').name gets us the absolute path to a local resource
            this.setConfig(getResource('config/log4j.properties').path);
        }
        return org.apache.log4j.Logger.getLogger(name);
    }

    // now that getLogger is installed we can get our own log
    var log = this.getLogger(__name__);

    /**
     * Render log4j messages to response buffer in the style of helma 1 res.debug().
     */
    this.onRequest = function() {
        // Install list in 'responseLog' threadlocal
        if (responseLogEnabled) {
            var cx = system.getRhinoContext();
            cx.putThreadLocal('responseLog', new java.util.LinkedList());
        }
    }

    /**
     * Write the log4j response buffer to the main response buffer and reset it.
     * This can either be called manually to insert the log buffer at any given position
     * in the response, or it will called by the log4j response listener after the
     * response has been generated.
     */
    this.onResponse = this.onError = function(req, res) {
        if (!responseLogEnabled || (res.status != 200 && res.status < 400)) {
            return;
        }
        var cx = system.getRhinoContext();
        var list = cx.getThreadLocal('responseLog');

        if (list) {
            for (var i = 0; i < list.size(); i++) {
                var item = list.get(i);
                var b = new Buffer();
                res.write("<div class=\"helma-debug-line\" style=\"background: #fc3;");
                res.write("color: black; border-top: 1px solid black;\">");
                res.write(item[0]);
                if (item[1]) {
                    res.write("<h4 style='padding-left: 8px; margin: 4px;'>Script Stack</h4>");
                    res.write("<pre style='margin: 0;'>", item[1], "</pre>");
                }
                if (item[2]) {
                    res.write("<h4 style='padding-left: 8px; margin: 4px;'>Java Stack</h4>");
                    res.write("<pre style='margin: 0;'>", item[2], "</pre>");
                }
                res.writeln("</div>");
            }
        }
    };


}).call(this);
