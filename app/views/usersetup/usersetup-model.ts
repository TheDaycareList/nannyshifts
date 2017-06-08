import { Observable } from 'data/observable';
import { ObservableArray } from 'data/observable-array';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import { UserService } from '../shared/user.service';

export class UserSetup extends Observable {
    constructor() {
        super();
    }

    private userService = new UserService();

    public hourlyRate: number;
    public overtimeRate: number;
    public saving: boolean = false;
    public families = new ObservableArray([]);
    public addingFamily: boolean = false;
    public addingFamilyName: string;
    public addingFamilyEmail: string;

    public saveRates() {
        console.log(this.hourlyRate + ' ' + this.overtimeRate);
        if (this.hourlyRate && this.overtimeRate && this.families.length) {
            let args = {
                hourlyRate: this.hourlyRate,
                overtimeRate: this.overtimeRate
            }
            this.userService.updateUser(args).then(result => {
                console.log('yay!');
                frame.topmost().navigate({
                    moduleName: '/views/home/home',
                    backstackVisible: false,
                    animated: true,
                    clearHistory: true
                })
            })
        }
    }

    public showAddFamily() {
        this.set('addingFamily', true);
    }

    public addFamily() {
        let familyObj = {
            name: this.addingFamilyName,
            email: this.addingFamilyEmail
        }
        this.families.push(familyObj)
        
        this.userService.addFamily(familyObj).then(result => {
            console.log('added family');
            let uid = JSON.parse(appSettings.getString('uid'));
            console.log(uid);
            this.userService.getUser(uid).then(() => {
                this.set('addingFamilyName', '');
                this.set('addingFamilyEmail', '');
                console.dump(JSON.parse(appSettings.getString('userData')));
                this.set('addingFamily', false)
            });
        });
    }

    public alert() {
        alert('Hi');
    }

    public kill() {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    }
}