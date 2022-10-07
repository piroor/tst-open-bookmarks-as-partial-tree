# TST Open Bookmarks as Partial Tree

![Build Status](https://github.com/piroor/tst-open-bookmarks-as-partial-tree/actions/workflows/main.yml/badge.svg?branch=trunk)

This extends another addon [Tree Style Tab (TST)](https://addons.mozilla.org/firefox/addon/tree-style-tab/).

* [Signed package on AMO](https://addons.mozilla.org/firefox/addon/tst-open-bookmarks-as-partial-/)
* [Development builds for each commit are available at "Artifacts" of the CI/CD action](https://github.com/piroor/tst-open-bookmarks-as-partial-tree/actions?query=workflow%3ACI%2FCD)

TST allows you to create bookmarks from a tabs tree. The tree structure are saved to created bookmarks as a prefix `>` in their title, like follwoing:

* `A1`
* `> B1`
* `>> C1`
* `>> C2`
* `> B2`

TST itself provides ability to open all these bookmarks as a tree. However, if you have very large number of bookmarks in a folder, you may want only a part of them to be opened, for example "a subtree under B1".

This addon adds a new context menu command "Open as a Partial Tree from here" on bookmarks with such tree structure information. On this example, only three bookmarks B1, C1, and C2 will be opened as a tree when you run the command on the B1.
![(Screenshot)](screenshots/bookmarks-to-tabs.png)

One more addition, this addon provides ability to open bookmarks in container tabs with a tree structure. The feature can be activated on the options page.
![(Screenshot)](screenshots/options.png)

This addon is compatible to another addon [Container Bookmarks.](https://addons.mozilla.org/firefox/addon/container-bookmarks/) If bookmarks have any container information saved by Container Bookmarks, this addon respects it and opens bookmarks in container tabs.

## Privacy Policy

This software does not collect any privacy data automatically, but this includes ability to synchronize options across multiple devices automatically via Firefox Sync.
Any data you input to options may be sent to Mozilla's Sync server, if you configure Firefox to activate Firefox Sync.

このソフトウェアはいかなるプライバシー情報も自動的に収集しませんが、Firefox Syncを介して自動的に設定情報をデバイス間で同期する機能を含みます。
Firefox Syncを有効化している場合、設定画面に入力されたデータは、Mozillaが運用するSyncサーバーに送信される場合があります。
