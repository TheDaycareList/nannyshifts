import { Page, getViewById } from 'ui/page';
import { StackLayout } from 'ui/layouts/stack-layout';
import { AnimationDefinition } from "ui/animation";
import { AnimationCurve } from "ui/enums";
import * as frame from 'ui/frame';



export function animateShow() {

    return new Promise((resolve, reject) => { 
        let view = frame.topmost().currentPage;    
        let dimmer:StackLayout = <StackLayout>getViewById(view, 'picker_dimmer');
        let picker:StackLayout = <StackLayout>getViewById(view, 'picker_holder');
        dimmer.opacity = 0;
        dimmer.animate(<AnimationDefinition>{
            opacity: 1,
            duration: 500,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(() => {
            resolve();
        });
        picker.opacity = 0;
        picker.scaleX = .7;
        picker.scaleY = .7;
        picker.animate(<AnimationDefinition>{
            opacity: 1,
            scale: {x: 1, y: 1},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        
    })
    
    
}

export function animateHide() {
    return new Promise((resolve, reject) => { 
        let view = frame.topmost().currentPage;    
        let dimmer:StackLayout = <StackLayout>getViewById(view, 'picker_dimmer');
        let picker:StackLayout = <StackLayout>getViewById(view, 'picker_holder');
        dimmer.animate(<AnimationDefinition>{
            opacity: 0,
            duration: 500,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(() => {
            resolve();
        });
        picker.animate(<AnimationDefinition>{
            opacity: 0,
            scale: {x: .7, y: .7},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
    })
}