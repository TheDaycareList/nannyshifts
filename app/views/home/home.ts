import { EventData, Observable } from 'data/observable';
import { Page } from 'ui/page';
import { HomeModel } from './home-model';
import * as firebase from 'nativescript-plugin-firebase';
import { GestureTypes, PanGestureEventData } from "ui/gestures";
import { AnimationCurve } from "ui/enums";
import { AnimationDefinition } from "ui/animation";
import { screen } from "platform";
import * as builder from 'ui/builder';
import { StackLayout } from 'ui/layouts/stack-layout';
import * as fs from 'file-system';
import * as dialogs from 'ui/dialogs';
import { UserService } from '../shared/user.service';

let page;
let settingsContainer: StackLayout;
let settingsOverlayContainer;
let dismissNote;

let blurView: any = false;
let userService: UserService;
declare var UIBarStyleBlack:any, UIBarMetricsDefault:any, NSForegroundColorAttributeName:any, NSDictionary:any, UIImage:any, UIColor:any, UIVisualEffectView:any, UIBlurEffect:any, UIViewAutoresizingFlexibleHeight:any, UIViewAutoresizingFlexibleWidth:any, UIBlurEffectStyleLight:any, UIStatusBarStyle:any, UIBlurEffectStyleDark: any;

export function loaded(args: EventData) {
    page = <Page>args.object;
    userService = new UserService();
    settingsContainer = page.getViewById('settings_container');
    settingsOverlayContainer = page.getViewById('settings_overlay_container')
    dismissNote = page.getViewById('dismiss_note');
    let buzz = UISelectionFeedbackGenerator.new();
    settingsContainer.on(GestureTypes.pan, function (args: PanGestureEventData) {
        //console.log("Pan deltaX:" + args.deltaX + "; deltaY:" + args.deltaY + ";");
        settingsContainer.translateY = args.deltaY;
        if (args.deltaY > 150) {
            
            if (dismissNote.opacity == 0) {
                buzz.selectionChanged();
                dismissNote.animate({
                    opacity: 1,
                    duration: 250
                })
            }
        } else {
            if (dismissNote.opacity == 1) {
                dismissNote.animate({
                    opacity: 0,
                    duration: 250
                })
            }
        }
        if (args.state == 3) {
            if (args.deltaY > 150) {
                settingsContainer.animate(<AnimationDefinition>{
                    translate: {x: 0, y: 1000},
                    duration: 500,
                    curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
                }).then(() => {
                    page.bindingContext.set('settingsShown', false)
                    settingsContainer.translateY = 0;
                    dismissNote.opacity = 0;
                })
                settingsOverlayContainer.animate(<AnimationDefinition>{
                    opacity: 0,
                    duration: 500,
                    curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
                }).then(() => {
                    settingsOverlayContainer.opacity = 1;
                })
            } else {
                settingsContainer.animate(<AnimationDefinition>{
                    translate: {x: 0, y: 0},
                    duration: 200,
                    curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
                })
            }
        }
        console.log('pulling down ' + args.deltaY + ' points');
    });
    page.bindingContext = new HomeModel();

    page.bindingContext.set('editRates', function() {
        showSettings('/views/components/editrates/editrates.xml');
        page.bindingContext.set('settingsTitle', 'Edit Rates');
    })

    page.bindingContext.set('saveRates', function() {
        console.log(page.bindingContext.get('user').hourlyRate);
        console.log(page.bindingContext.get('user').overtimeRate);
    })

    page.bindingContext.set('editFamily', function(args) {
        let families = page.bindingContext.get('families');
        let family = families.filter(item => item.id === args.object.id)[0];
        page.bindingContext.set('editingFamily', family);
        showSettings('/views/components/editfamily/editfamily.xml');
        page.bindingContext.set('settingsTitle', 'Edit Family');
        page.getViewById('family_name').text = family.get('name');
        page.getViewById('family_email').text = family.get('email');
    })

    page.bindingContext.set('addFamily', function() {
        page.bindingContext.set('editingFamily', false);
        showSettings('/views/components/editfamily/editfamily.xml');
        page.bindingContext.set('settingsTitle', 'Add Family');
    })

    page.bindingContext.set('saveFamily', function() {
        let editingFamily = page.bindingContext.get('editingFamily');
        let data:any = {
            name: page.getViewById('family_name').text,
            email: page.getViewById('family_email').text
        }
        if (editingFamily) {
            userService.saveFamily(editingFamily.get('id'), data).then((result) => {
                let families = page.bindingContext.get('families');
                families.forEach(element => {
                    if (element.get('id') == editingFamily.get('id')) {
                        element.set('name', data.name);
                        element.set('email', data.email);
                    }
                });
                page.bindingContext.hideSettings();
            })
        } else {
            let families = page.bindingContext.get('families');
            userService.addFamily(data).then((result:any) => {
                let families = page.bindingContext.get('families');
                data.id = result.key;
                families.push(new Observable(data));
                page.bindingContext.set('familiesCount', families.length);
                if (families.length == 1) {
                    page.bindingContext.set('justOneFamily', true);
                } else {
                    page.bindingContext.set('justOneFamily', false);
                }
                
                page.bindingContext.hideSettings();
            })
        }        
    })

    page.bindingContext.set('removeFamily', function(args) {
        console.log(args.object.id);
        let famId = args.object.id;
        dialogs.confirm('Are you sure you want to remove this family?').then((result) => {
            if (result) {
                userService.updateFamily(famId, {deleted: true}).then((result) => {
                    let families = page.bindingContext.get('families');
                    let deleteIndex;
                    families.forEach((element, index) => {
                        if (element.get('id') == famId) deleteIndex = index;
                    });
                    families.splice(deleteIndex, 1)
                    console.log(families.length);
                    page.bindingContext.set('families', families);
                    page.bindingContext.set('familiesCount', families.length);
                    if (families.length == 1) {
                        page.bindingContext.set('justOneFamily', true);
                    } else {
                        page.bindingContext.set('justOneFamily', false);
                    }
                    page.bindingContext.hideSettings();
                })
            }
        })
    })

    page.bindingContext.set('hideSettings', function() {
        let deviceHeight = screen.mainScreen.heightDIPs;
        settingsContainer.animate(<AnimationDefinition>{
            translate: {x: 0, y: deviceHeight - 30},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(() => {
            page.bindingContext.set('settingsShown', false);
        })
        settingsOverlayContainer.animate({
            opacity: 0,
            duration: 300
        })
    })
}

function showSettings(viewPath) {
    console.log(viewPath);
    page.bindingContext.set('settingsShown', true);
    let deviceHeight = screen.mainScreen.heightDIPs;
    settingsContainer.translateY = deviceHeight + 30;
    settingsContainer.animate(<AnimationDefinition>{
        translate: {x: 0, y: 0},
        duration: 300,
        curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
    })
    settingsOverlayContainer.opacity = 0;
    settingsOverlayContainer.animate({
        opacity: 1,
        duration: 100
    })
    var container: StackLayout = page.getViewById('settings_view');
    container.removeChildren();
    let path = fs.knownFolders.currentApp().path;
    let component = builder.load(path + viewPath);
    container.addChild(component);

    let containerBounds = settingsContainer.ios.bounds;
    if (!blurView) {
        blurView = UIVisualEffectView.alloc().initWithEffect(UIBlurEffect.effectWithStyle(UIBlurEffectStyleLight));

        blurView.frame = {
            origin: { x: containerBounds.origin.x, y: containerBounds.origin.y - 20 },
            size: { width: containerBounds.size.width, height: containerBounds.size.height + 20 }
        };
        blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        settingsContainer.ios.addSubview(blurView);
        settingsContainer.ios.sendSubviewToBack(blurView);
    }
    

}