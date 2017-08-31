import {EventData, Observable, PropertyChangeData, fromObject as observableFromObject} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import { Page } from 'ui/page';
import { UserService, User } from '../../shared/user.service';
import { ShiftService } from '../../shared/shift.service';
import { SelectedIndexChangedEventData, TabView } from "ui/tab-view";
import { HomeModel } from '../../home/home-model'
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';

let shiftService: ShiftService;
export class InvoicesModel extends HomeModel {

    constructor(view) {
        super();
    }
}