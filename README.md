#linkiful

linkiful is a light weight application that lets you save links which you would like to visit again. You can edit, delete, tag, search, filter, backup and restore your saved links.

It uses the browser's persistent local storage as a mini database to store all the links. Built entirely with JavaScript, it runs nicely in a separate tab. Both the data and the operations is managed by the JS code and hence the app could be used offline.

This repository has the 'offline' version of linkful. Meaning, you can just open the 'linkful.html' from you file storage and start using the app. Download and extract the zip and we are ready to go.

An 'online' version of the app, with full backend, is hosted on Google App Engine.

[linkiful](http://www.linkiful.appspot.com)

The online version of app is in no way different from the one in this repository. It provides exactly the same features, still uses localStorage and all the operations, still, are managed by JS in browser. What extra is that you get to backup and restore your links from an online server. Visit the [linkiful user guide](http://www.linkiful.appspot.com/tutorial) page for detailed explanation.

Remember, localStorage is scoped by the browser and the document origin. So http://linkiful.appspot.com (or the "file:///your-directory-address/linkiful.html" if you run the 'offline' version from you file storage), just serves as a localStorage scoping hook. 
