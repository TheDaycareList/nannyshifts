import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';
import * as http from 'http';
import Config from '../../config';

export interface User {
    hourlyRate: string,
    overtimeRate: string,
    uid: string,
    date_created: string,
    email: string,
    first_name: string,
    last_name: string,
    families?: Array<any>
}

export class UserService {
    public getUser(uid) {
        return new Promise<User>((resolve, reject) => { 
            firebase.query(
                queryResult => {
                    let user: User;
                    if (queryResult.value) {
                        for (var i in queryResult.value) {
                            user = queryResult.value;
                        }
                    }
                    if (user) {
                        if (user.families) {
                            for (let x in user.families) {
                                if (user.families[x].deleted) {
                                    delete user.families[x];
                                } else {
                                    user.families[x].id = x;
                                }
                            }
                        }
                        appSettings.setString('userData', JSON.stringify(user));
                        resolve(user)
                    } else {
                        reject("No user found.")
                    }
                }, 
                '/users/' + uid, 
                {
                    singleEvent: true,
                    orderBy: {
                        type: firebase.QueryOrderByType.CHILD,
                        value: 'date_created'
                    }
                }
            );

        })
    }

    public updateUser(data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                console.dir(data);
                firebase.update('/users/' + uid, data).then(result => {
                    // the result here is always undefined.
                    let savedUser = JSON.parse(appSettings.getString('userData'));
                    for (var i in data) savedUser[i] = data[i];
                    appSettings.setString('userData', JSON.stringify(savedUser));
                    resolve(savedUser);
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public addFamily(data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.push('/users/' + uid + '/families', data).then(result => {
                    this.getUser(uid).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public sendEmail(to, from, title, msg, subject) {

        let emailContent: any = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": to.email,
                            "name": to.name
                        }
                    ],
                    "subject": subject
                }
            ],
            "from": {
                "email": from.email,
                "name": from.name
            },
            "reply_to": {
                "email": from.email,
                "name": from.name
            },
            "subject": subject,
            "content": [
                {
                    "type": "text/html",
                    "value": '<html><p><div style="max-width: 600px; margin: auto; font-family: Helvetica;"><center><img src="https://dev.dailynannyapp.com/images/nannyshifts_logo.png" style="width: 200px;"/><br /><h2>' + title + '</h2><span style="font-size: 16px; font-weight: 300; line-height: 20px;">' + msg + '</span><br /><br /><span style="font-size: 11px; color: gray;">Just reply to this email with questions or comments.<br/><br/><a href="http://nannyshifts.com">nannyshifts.com</a></span></center></div></p></html>'
                }
            ]
        }
        let options: http.HttpRequestOptions = {
            url: 'https://api.sendgrid.com/v3/mail/send',
            method: 'post',
            headers: {
                "authorization": "bearer " + Config.sendGridApiKey,
                "Content-Type": "application/json"
            },
            content: JSON.stringify(emailContent)
        }

        console.log('about to send email to ' + to.email);
        return http.request(options).then(result => {
            //console.dir(result);
        })
    }

    public saveFamily(id, data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.setValue('/users/' + uid + '/families/' + id, data).then(result => {
                    // update the saved user.
                    this.getUser(uid).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public updateFamily(id, data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.update('/users/' + uid + '/families/' + id, data).then(result => {
                    // update the saved user.
                    this.getUser(uid).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }
}