# TST Open Bookmarks as Partial Tree

[![Build Status](https://travis-ci.org/piroor/tst-open-bookmarks-as-partial-tree.svg?branch=master)](https://travis-ci.org/piroor/tst-open-bookmarks-as-partial-tree)

This extends another addon [Tree Style Tab (TST)](https://addons.mozilla.org/firefox/addon/tree-style-tab/).

TST allows you to create bookmarks from a tabs tree. The tree structure are saved to created bookmarks as a prefix `>` in their title, like follwoing:

* `A1`
* `> B1`
* `>> C1`
* `>> C2`
* `> B2`

TST itself provides ability to open all these bookmarks as a tree. However, if you have very large number of bookmarks in a folder, you may want only a part of them to be opened, for example "a subtree under B1".

This addon adds a new context menu command "Open as a Partial Tree from here" on bookmarks with such tree structure information. On this example, only three bookmarks B1, C1, and C2 will be opened as a tree when you run the command on the B1.

One more addition, this addon provides ability to open bookmarks in container tabs with a tree structure. The feature can be activated on the options page.
