import { EventData, Observable } from 'data/observable';
import { Page } from 'ui/page';
import { HomeModel } from './home-model';

export function loaded(args: EventData) {
    let page = <Page>args.object;
    let homeModel = new HomeModel();
    homeModel.pageLoaded(page);
}


// export function startShift() {
//     let args = {
//         start_time: moment().format(),
//         end_time: null,
//         uid: JSON.parse(appSettings.getString('uid'))
//     }
//     shiftService.startShift(args).then(result => {
//         console.log('saved something?');
//     })
// }