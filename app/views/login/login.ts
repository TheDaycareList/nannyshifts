import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { LoginModel } from './login-model';
import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';
import * as frame from 'ui/frame';

export function loaded(args: EventData) {
    let page = <Page>args.object;
    
    console.log('looking for stored userdata');
    if (appSettings.getString('userData')) {
        let userData = JSON.parse(appSettings.getString('userData'));

        console.dump(userData);

        if (!userData.hourlyRate) {
            frame.topmost().navigate({
                moduleName: '/views/usersetup/usersetup',
                backstackVisible: false,
                animated: false,
                clearHistory: true
            })
        } else {
            frame.topmost().navigate({
                moduleName: '/views/home/home',
                backstackVisible: false,
                animated: false,
                clearHistory: true
            })
        }
    }

    firebase.init().then((instance) => {
        //console.log("firebase.init done");
    }, (error) => {
        //console.log("firebase.init error: " + error);
    });
    page.bindingContext = new LoginModel();
}