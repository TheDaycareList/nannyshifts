import {Observable} from 'data/observable';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';

import { UserService } from '../shared/user.service';


export class LoginModel extends Observable {
    constructor() {
        super();
    }

    private userService = new UserService();

    public email: string = 'dave@davecoffin.com';
    public password: string = 'Endien1.';
    public password2: string;
    public loggingIn: boolean = true;

    public toggleMethod() {
        this.set('loggingIn', !this.loggingIn);
        console.log('Logging in: ' + this.loggingIn);
    }

    public getUserByEmail() {
        console.log('hello');
        let options:firebase.QueryOptions = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'email'
            },
            range: {
                type: firebase.QueryRangeType.EQUAL_TO,
                value: 'dave+2@davecoffin.com'
            }
        }

        firebase.query(
            queryResult => {
                if (queryResult.value) {
                    console.log(JSON.stringify(queryResult.value))
                }
            }, 
            '/users/', 
            options
        );
    }

    public signup() {
        console.log('signup');
        if (this.email && this.password) {
            if (this.password != this.password2) {
                alert('The passwords you entered do not match.')
                return;
            }
            firebase.createUser({
                email: this.email,
                password: this.password
            }).then((result) => {
                appSettings.setString('uid', JSON.stringify(result.key));
                let userObj = {
                    "date_created": moment().format(),
                    "email": this.email
                };
                firebase.setValue('/users/' + result.key, userObj).then(() => {
                    appSettings.setString('userData', JSON.stringify(userObj));
                    frame.topmost().navigate({
                        moduleName: '/views/usersetup/usersetup',
                        backstackVisible: false,
                        animated: false,
                        clearHistory: true
                    })
                });
                

            }, (errorMessage) => {
                dialogs.alert({
                    title: "No user created",
                    message: errorMessage,
                    okButtonText: "OK, got it"
                })
            });
        }
    }


    public login() {
        console.log('login');
        if (this.email && this.password) {
            firebase.login({
                type: firebase.LoginType.PASSWORD,
                // passwordOptions: {
                    email: this.email,
                    password: this.password
                // }
            }).then((result) => {
                this.userService.getUser(result.uid).then(user => {
                    if (user) {
                        console.dir(user);
                        appSettings.setString('uid', JSON.stringify(result.uid));
                        if (!user.hourlyRate) {
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
                })
            }, (errorMessage) => {
                console.log(errorMessage)
            });
        }
    }
}