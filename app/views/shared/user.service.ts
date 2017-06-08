import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';

export interface User {
    hourlyRate: string,
    overtimeRate: string,
    uid: string,
    date_created: string,
    email: string
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
                        console.dump(user);
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

                firebase.update('/users/' + uid, data).then(result => {
                    // the result here is always undefined.
                    let savedUser = JSON.parse(appSettings.getString('userData'));
                    for (var i in data) savedUser[i] = data[i];
                    appSettings.setString('userData', JSON.stringify(savedUser));
                    console.log('in update result');
                    console.log('about to resolve');
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
                        console.dump(result);
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public saveFamily(id, data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.setValue('/users/' + uid + '/families/' + id, data).then(result => {
                    console.dump(result);
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
        console.log(uid);
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.update('/users/' + uid + '/families/' + id, data).then(result => {
                    console.dump(result);
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