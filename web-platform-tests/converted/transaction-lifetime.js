require("../../build/global.js");
const {
    add_completion_callback,
    assert_array_equals,
    assert_equals,
    assert_false,
    assert_not_equals,
    assert_throws,
    assert_true,
    async_test,
    createdb,
    createdb_for_multiple_tests,
    fail,
    indexeddb_test,
    setup,
    test,
} = require("../support-node.js");

const document = {};
const window = global;



    var db, db_got_versionchange, db2,
        events = [],
        t = async_test(document.title, {timeout: 10000});

    t.step(function() {
        var openrq = indexedDB.open('db', 3);

        // 1
        openrq.onupgradeneeded = t.step_func(function(e) {
            events.push("open." + e.type);
            e.target.result.createObjectStore('store');
        });

        // 2
        openrq.onsuccess = t.step_func(function(e) {
            db = e.target.result;

            events.push("open." + e.type);

            // 3
            db.onversionchange = t.step_func(function(e) {
                events.push("db." + e.type);

                assert_equals(e.oldVersion, 3, "old version");
                assert_equals(e.newVersion, 4, "new version");
                db.close();
            });

            // Errors
            db.onerror = fail(t, "db.error");
            db.abort = fail(t, "db.abort");

            step_timeout(t.step_func(OpenSecond), 10);
        });

        // Errors
        openrq.onerror = fail(t, "open.error");
        openrq.onblocked = fail(t, "open.blocked");

    });

    function OpenSecond (e) {
        assert_equals(db2, undefined);
        assert_equals(db + "", "[object IDBDatabase]");
        assert_array_equals(db.objectStoreNames, [ "store" ]);

        var openrq2 = indexedDB.open('db', 4);

        // 4
        openrq2.onupgradeneeded = t.step_func(function(e) {
            db2 = e.target.result;

            events.push("open2." + e.type);

            assert_equals(db2 + "", "[object IDBDatabase]");

            // Errors
            db2.onversionchange = fail(t, "db2.versionchange");
            db2.onerror = fail(t, "db2.error");
            db2.abort = fail(t, "db2.abort");
        });

        // 5
        openrq2.onsuccess = t.step_func(function(e) {
            events.push("open2." + e.type);

            assert_array_equals(events,
                [ "open.upgradeneeded",
                  "open.success",
                  "db.versionchange",
                  "open2.upgradeneeded",
                  "open2.success",
                ]);

            step_timeout(function() { t.done(); }, 10);
        });

        // Errors
        openrq2.onerror = fail(t, "open2.error");
        openrq2.onblocked = fail(t, "open2.blocked");
    }


    // Cleanup
    add_completion_callback(function(tests) {
        if (db2) db2.close();
        indexedDB.deleteDatabase('db');
    })
