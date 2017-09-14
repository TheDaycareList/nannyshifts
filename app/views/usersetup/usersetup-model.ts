import { Page, getViewById } from 'ui/page';
import { StackLayout } from 'ui/layouts/stack-layout';
import { Observable } from 'data/observable';
import { ObservableArray } from 'data/observable-array';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import { UserService } from '../shared/user.service';
import { AnimationDefinition } from "ui/animation";
import { AnimationCurve } from "ui/enums";

let userService: UserService;
let MyModel: UserSetup;

export class UserSetup extends Observable {
    constructor() {
        super();
        userService = new UserService();
        MyModel = this;
    }

    

    public hourlyRate: number;
    public overtimeRate: number;
    public saving: boolean = false;
    public families = new ObservableArray([]);
    public addingFamily: boolean = false;
    public addingFamilyName: string;
    public addingFamilyEmail: string;

    public saveRates() {
        if (this.hourlyRate && this.overtimeRate && this.families.length) {
            let args = {
                hourlyRate: this.hourlyRate,
                overtimeRate: this.overtimeRate
            }
            userService.updateUser(args).then(result => {
                console.log('yay!');
                frame.topmost().navigate({
                    moduleName: '/views/home/home',
                    backstackVisible: false,
                    animated: true,
                    clearHistory: true
                })
            })
        } else {
            if (!this.families.length) {
                alert('Please enter at least one family.');
            } else {
                alert('Please enter your hourly rate and overtime rate. If they are the same, enter it twice!')
            }
        }
    }

    public showAddFamily() {
        let view = frame.topmost().currentPage;    
        let dimmer:StackLayout = <StackLayout>getViewById(view, 'dimmer');
        let picker:StackLayout = <StackLayout>getViewById(view, 'chooser_holder');
        this.set('addingFamily', true);
        dimmer.opacity = 0;
        dimmer.animate(<AnimationDefinition>{
            opacity: 1,
            duration: 500,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        picker.opacity = 0;
        picker.scaleX = .7;
        picker.scaleY = .7;
        picker.animate(<AnimationDefinition>{
            opacity: 1,
            scale: {x: 1, y: 1},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        
    }

    public addFamily() {
        let familyObj:any = {
            name: this.addingFamilyName,
            email: this.addingFamilyEmail
        }
        
        this.closeAddFamily();
        userService.addFamily(familyObj).then((result:any) => {
            familyObj.id = result.key;
            this.families.push(familyObj)
            let uid = JSON.parse(appSettings.getString('uid'));
            userService.getUser(uid).then(() => {
                this.set('addingFamilyName', '');
                this.set('addingFamilyEmail', '');
            });
        });
    }

    public closeAddFamily() {
        let view = frame.topmost().currentPage;    
        let dimmer:StackLayout = <StackLayout>getViewById(view, 'dimmer');
        let picker:StackLayout = <StackLayout>getViewById(view, 'chooser_holder');
        dimmer.animate(<AnimationDefinition>{
            opacity: 0,
            duration: 500,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(() => {
            this.set('addingFamily', false);
        });
        picker.animate(<AnimationDefinition>{
            opacity: 0,
            scale: {x: .7, y: .7},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
    }

    public alert() {
        alert('Hi');
    }

    public removeFamily(args) {
        let famId = args.object.id;
        dialogs.confirm('Are you sure you want to remove this family?').then((decision) => {
            if (decision) {
                userService.updateFamily(famId, {deleted: true}).then((result) => {
                    let deleteIndex;
                    MyModel.families.forEach((element, index) => {
                        if (element.id == famId) deleteIndex = index;
                    });
                    MyModel.families.splice(deleteIndex, 1)
                })
            }
        })
    }

    public kill() {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    }
}