/* Main stats page */
var rawDataIsLoading = false
var statusPagePassword = false

// Raw data updating
var minUpdateDelay = 1000 // Minimum delay between updates (in ms).
var lastRawUpdateTime = new Date()

function addWorker(mainWorkerHash, accountHash) {
    var row = `
     <div id="row_${accountHash}" class="status_row">
       <div id="name_${accountHash}" class="status_cell"/>
       <div id="login_type_${accountHash}"     class="status_cell"/>
       <div id="total_scans_${accountHash}"  class="status_cell"/>
       <div id="total_fails_${accountHash}"     class="status_cell"/>
       <div id="fail_rate_${accountHash}"     class="status_cell"/>
       <div id="total_empty_${accountHash}" class="status_cell"/>
       <div id="empty_rate_${accountHash}" class="status_cell"/>
       <div id="total_captcha_${accountHash}" class="status_cell"/>
       <div id="captcha_rate_${accountHash}" class="status_cell"/>
       <div id="total_success_${accountHash}"  class="status_cell"/>
       <div id="success_rate_${accountHash}"  class="status_cell"/>
       <div id="level_${accountHash}" class= "status_cell"/>
       <div id="lastmod_${accountHash}"  class="status_cell"/>
     </div>
   `

    $(row).appendTo('#table_' + mainWorkerHash)
}

function processAccount(i, account) {
    var hash = hashFnv32a(account['name'], true)
    var mainWorkerHash
    mainWorkerHash = 'global'
    if ($('#table_global').length === 0) {
        addTable('global')
    }

    if ($('#row_' + hash).length === 0) {
        addWorker(mainWorkerHash, hash)
    }

    var lastModified = new Date(account['last_active'])
    lastModified = lastModified.getFullYear() + '/' +
        (lastModified.getMonth() + 1) + '/' + lastModified.getDate() + ' ' +
        lastModified.getHours() + ':' +
        ('0' + lastModified.getMinutes()).slice(-2) + ':' +
        ('0' + lastModified.getSeconds()).slice(-2)

    $('#name_' + hash).html(account['name'])
    $('#login_type_' + hash).html(account['login_type'])
    $('#total_scans_' + hash).html(account['total_scans'])
    $('#total_fails_' + hash).html(account['total_fails'])
    $('#total_empty_' + hash).html(account['total_empty'])
    $('#fail_rate_' + hash).html(account['fail_rate'])
    $('#empty_rate_' + hash).html(account['empty_rate'])
    $('#captcha_rate_' + hash).html(account['captcha_rate'])
    $('#lastmod_' + hash).html(lastModified)
    $('#total_success_' + hash).html(account['total_success'])
    $('#success_rate_' + hash).html(account['success_rate'])
    $('#level_' + hash).html(account['level'])
    $('#total_captcha_' + hash).html(account['total_captcha'])
}

function parseResult(result) {
    $.each(result.accounts, processAccount)
}


/*
 * Tables
 */
function addTable(hash) {
    var table = `
     <div class="status_table" id="table_${hash}">
       <div class="status_row header">
         <div class="status_cell">
           Username
         </div>
         <div class="status_cell">
           Type
         </div>
         <div class="status_cell">
           Total Scans
         </div>
         <div class="status_cell">
           Fails
         </div>
         <div class="status_cell">
           Fails %
         </div>
         <div class="status_cell">
           Empty
         </div>
         <div class="status_cell">
           Empty %
         </div>
         <div class="status_cell">
           Captcha
         </div>
         <div class="status_cell">
           Captcha %
         </div>
         <div class="status_cell">
           Success
         </div>
         <div class="status_cell">
           Success %
         </div>
         <div class="status_cell">
           Level
         </div>
         <div class="status_cell">
           Last Used
         </div>
       </div>
     </div>
   `

    table = $(table)
    table.appendTo('#status_container')
    table.find('.status_row.header .status_cell').click(tableSort)
}

function tableSort() {
    var table = $(this).parents('.status_table').eq(0)
    var rows = table.find('.status_row:gt(0)').toArray().sort(compare($(this).index()))
    this.asc = !this.asc
    if (!this.asc) {
        rows = rows.reverse()
    }
    for (var i = 0; i < rows.length; i++) {
        table.append(rows[i])
    }
}

function getCellValue(row, index) {
    return $(row).children('.status_cell').eq(index).html()
}


/*
 * Helpers
 */
function compare(index) {
    return function (a, b) {
        var valA = getCellValue(a, index)
        var valB = getCellValue(b, index)
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB)
    }
}

function updateStatus() {
    loadRawData().done(function (result) {
        // Parse result on success.
        parseResult(result)
    }).always(function () {
        // Only queue next request when previous is over.
        // Minimum delay of minUpdateDelay.
        var diff = new Date() - lastRawUpdateTime
        var delay = Math.max(minUpdateDelay - diff, 1) // Don't go below 1.

        // Don't use interval.
        window.setTimeout(updateStatus, delay)
    })
}

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as
 *     8-digit hex string instead of an integer
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer | string}
 */
function hashFnv32a(str, asString, seed) {
    /* jshint bitwise:false */
    var i
    var l
    var hval = (seed === undefined) ? 0x811c9dc5 : seed

    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i)
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24)
    }

    if (asString) {
        // Convert to 8 digit hex string
        return ('0000000' + (hval >>> 0).toString(16)).substr(-8)
    }
    return hval >>> 0
}

function loadRawData() {
    return $.ajax({
        url: 'accounts',
        type: 'post',
        data: {
            'password': statusPagePassword
        },
        dataType: 'json',
        beforeSend: function () {
            if (rawDataIsLoading) {
                return false
            } else {
                rawDataIsLoading = true
            }
        },
        complete: function () {
            rawDataIsLoading = false
        }
    })
}


/*
 * Document ready
 */
$(document).ready(function () {
    // Set focus on password field.
    $('#password').focus()

    // Register to events.
    $('#password_form').submit(function (event) {
        event.preventDefault()

        statusPagePassword = $('#password').val()

        loadRawData().done(function (result) {
            if (result.login === 'ok') {
                $('.status_form').remove()
                parseResult(result)
                window.setTimeout(updateStatus, minUpdateDelay)
            } else {
                $('.status_form').effect('bounce')
                $('#password').focus()
            }
        })
    })
})
