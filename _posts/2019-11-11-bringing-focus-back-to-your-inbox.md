---
layout: post
title: Bringing focus back to your inbox
description: I realised recently that my primary email account is barely fulfilling its purpose anymore. The main cause&colon; over-subscription has devalued the utility of the basic service. In other words, since the majority of the emails I received have basically zero value, I give much less attention to those that are actually valuable. I decided to take action and brutally cull and unsubscribe from all but the most important or valuable services. The main problem with this decision is that I am fairly lazy so wanted to do as little manual labor as possible. Since I'm also rather forgetful and will surely need to do this again in the future I'm really hoping that this post will help the future me! 
tags: 2019 snippet email javascript python
date: 2019-11-08
author: Niall Twomey
comments: false
---

First, I needed to get a list of emails that routinely send me emails. I did some searching online and came across [this](https://helgeklein.com/blog/2015/02/extracting-all-email-addresses-from-a-gmail-label/) article that does 90% of what I needed. It used Google's <a href="https://script.google.com">scripting language</a> for <a href="https://docs.google.com/spreadsheets">Google Sheets</a> that a provides high-level API that queries Gmail. I edited the code a small bit for my own purposes. Specifically I wanted to introduce a semi-persistent cursor location and to dump the email addresses to a spreadsheet. My modified version of the code is at the bottom of this page. 

The following outlines the approach to get the email addresses: 

1. Create a new spreadsheet via [https://docs.google.com/spreadsheets](https://docs.google.com/spreadsheets). 
2. Set the cells A1 and B1 to `Offset` and `0` respectively (only the cell B1 is important and at first should be set to 0). 
3. Click on the `Tools` menu, and then select `Script Editor`. 
4. Make a new script file, and set its contents with the contents of the javascript snippet at the bottom of this page. 
5. Run the function `GetAddresses` either from the spreadsheet (follow menu `Email Analysis`-> `Extract Email Addresses`) or from the script page (follow menu `Run` -> `Run function` -> `GetAddresses`). 
6. The script will ask for permission to access your active email account when it's first executed.
7. Wait until the script ends. It could take some time. 
8. It's good practise to remove the permissions that you granted to the spreadsheet afterwards. This can be done here: [https://myaccount.google.com/security-checkup](https://myaccount.google.com/security-checkup).

When the script terminates a new tab called `EmailAddresses` will be created. Dump the second column of this sheet to a file called `emails.csv`. If the python file below is in the same directory as `emails.csv` the list of the 50 most common email domains will be printed. 

```python
from collections import Counter

counts = Counter(map(
	lambda email: email.split('@')[-1], 
	filter(len, map(str.strip, open('emails.csv', 'r')))
))

for email, count in counts.most_common(50): 
    print(f'{email:>40s}: {count}')
```

This script obviously won't unsubscribe you from anything, but it will give you a priority list of the domains that email most frequently. My rationale is that it's unlikely that all of these have great value, so unsubscribing from them will help my inbox. 

I ended up deleting many the actual emails from the least important senders too, which freed up about 2 GB of storage space on my Google account. 

The modified javascript code is: 

```javascript
// Apart from a few small changes, this script is based almost completely on code from: 
//   https://helgeklein.com/blog/2015/02/extracting-all-email-addresses-from-a-gmail-label/

//
// Parse the email addresses from one search query
//
function GetAddressesFromPage(pageSize, userInputSheet, sheet) {
    var addressesOnly = [];
    var messageData = [];

    // The starting cursor position
    var startIndex = parseInt(userInputSheet.getRange("B1").getValue());

    // Search over range
    var threads = GmailApp.search("to:me", startIndex, pageSize);
    if (threads.length == 0)
        return false;

    // Get all messages for the current batch of threads
    var messages = GmailApp.getMessagesForThreads(threads);

    Logger.log("Parsing email addresses for page " + startIndex.toString());

    // Loop over all messages
    for (var i = 0; i < messages.length; i++) {
        // Loop over all messages in this thread
        for (var j = 0; j < messages[i].length; j++) {
            var mailFrom = messages[i][j].getFrom();
            var mailDate = messages[i][j].getDate();

            // mailFrom format may be either one of these:
            // name@domain.com
            // any text <name@domain.com>
            // "any text" <name@domain.com>

            var name = "";
            var email = "";
            var matches = mailFrom.match(/\s*"?([^"]*)"?\s+<(.+)>/);
            if (matches) {
                name = matches[1];
                email = matches[2];
            } else {
                email = mailFrom;
            }

            // Add the data
            addressesOnly.push(mailFrom);
            messageData.push([name, email, mailDate]);
        }
    }

    // Update the current cursor position
    userInputSheet.getRange("B1").setValue(startIndex + pageSize);

    // Add the parsed data to the SS
    sheet.getRange(sheet.getLastRow() + 1, 1, messageData.length, 3).setValues(messageData);

    return true;
}

//
// Searches one label for the first time someone sent you an email
// Returns name, e-mail address (extracted from the "From" field) and message time
//
function GetAddresses() {
    // Get the active spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Num iterations
    var count = 50;

    // Label to search
    var userInputSheet = ss.getSheets()[0];

    var pageSize = 250;

    // Create / empty the target sheet
    var sheetName = "EmailAddresses";
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName, ss.getSheets().length);

    // Get all messages in a nested array (threads -> messages)
    while (1) {
        var ret = GetAddressesFromPage(pageSize, userInputSheet, sheet);
        if (ret == false)
            break;

        // Termination conditions
        if (--count <= 0)
            break;
    }
}


//
// Adds a menu to easily call the script
//
function onOpen() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();

    var menu = [{
        name: "Extract Email Addresses",
        functionName: "GetAddresses"
    }];

    sheet.addMenu("Email Analysis", menu);
}
```

Modifying the first agrument of `GmailApp.search` of the code below from `"to:me"` to `"unsubscribe"` instead prioritises the search for 'unsubscribe-able' emails.