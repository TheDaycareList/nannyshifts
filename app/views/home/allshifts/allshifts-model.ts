import {EventData, Observable, PropertyChangeData, fromObject as observableFromObject} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import { Page } from 'ui/page';
import { UserService, User } from '../../shared/user.service';
import { ShiftService } from '../../shared/shift.service';
import { SelectedIndexChangedEventData, TabView } from "ui/tab-view";
import { HomeModel } from '../../home/home-model'
import * as appSettings from 'application-settings';
import * as moment from 'moment';

let shiftService: ShiftService;
export class AllShiftsModel extends HomeModel {

    constructor(view) {
        super();
        shiftService = new ShiftService();
        // view.parent.parent.on('selectedIndexChanged', (args:SelectedIndexChangedEventData) => {
        //     if (args.newIndex == 1) {
        //         this.getShifts();
        //     }
        // })
    }

    public allShiftsLoaded() {
        console.log('hi');
    }

    public initAllShifts() {
        console.log('get all your shifts here.');
        console.log()
    }

    public getShifts() {
        this.set('isLoading', true);
        shiftService.getShifts().then(shifts => {
            this.set('isLoading', false);
            this.processAllShifts(shifts);

        })
    }
    public processAllShifts(shifts) {
        let shiftsArray = [];
        for (var i in shifts) {
            let myShift = shiftService.buildShiftData(shifts[i]);
            myShift.id = i;
            if (!myShift.end_time) this.set('clockedIn', shifts[i]);

            
            shiftsArray.push(myShift);
        }

        shiftsArray.sort((a, b) => {
            if (moment(a.start_time) < moment(b.start_time)) {
                return 1;
            } else if (moment(a.start_time) > moment(b.start_time)) {
                return -1;
            }
        })


        for (var s = 0; shiftsArray.length > s; s++) {
            let shift = observableFromObject(shiftsArray[s]);
            if (!this.allShiftsMap[shiftsArray[s].id]) {
                this.allShifts.push(shift)
                this.allShiftsMap[shiftsArray[s].id] = shiftsArray[s];
            } else {
                let updateIndex;
                this.allShifts.forEach((element, index) => {
                    if (element.get('id') == shiftsArray[s].id) updateIndex = index;
                });
                this.allShifts.setItem(updateIndex, shift);
            }
        }
        
        console.dir(this.allShifts.length);
    }
}