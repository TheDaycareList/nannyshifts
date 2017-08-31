import { EventData, Observable } from 'data/observable';
import { Page } from 'ui/page';
import { HomeModel } from '../../home/home-model';
import { AllShiftsModel } from '../../home/allshifts/allshifts-model';
import { UserService, User } from '../../shared/user.service';
import { ShiftService } from '../../shared/shift.service';
import { StackLayout } from 'ui/layouts/stack-layout';


export function allShiftsLoaded(args: EventData) {
    let view:StackLayout = <StackLayout>args.object;
    view.bindingContext = new AllShiftsModel(view);
}

