import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { Tutorial } from './tutorial-model';

export function loaded(args: EventData) {
    let page = <Page>args.object;

   
    page.bindingContext = new Tutorial();
}