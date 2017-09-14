/*
In NativeScript, the app.ts file is the entry point to your application.
You can use this file to perform app-level initialization, but the primary
purpose of the file is to pass control to the app’s first module.
*/

import "./bundle-config";
import * as app from 'application';
import * as appSettings from 'application-settings';
import * as firebase from 'nativescript-plugin-firebase';
import * as frame from 'ui/frame';
console.log('about to call firebase.init');
firebase.init().then((instance) => {
    console.log("firebase.init done");
}, (error) => {
    console.log("firebase.init error: " + error);
});

console.log('looking for stored userdata');
if (appSettings.getString('userData')) {
    let userData = JSON.parse(appSettings.getString('userData'));
    if (!userData.hourlyRate || !userData.families) {
        app.start({ moduleName: "views/usersetup/usersetup", backstackVisible: false });
    } else {
        app.start({ moduleName: "views/home/home" });
    }
} else {
    app.start({ moduleName: "views/login/login", backstackVisible: false });
}


/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
