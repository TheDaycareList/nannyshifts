import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { SettingsModel } from './settings-model';
import { screen } from 'platform';
import { AnimationDefinition } from 'ui/animation';
import { AnimationCurve } from 'ui/enums';
let page: Page;
let settingsContainer;
let settingsOverlayContainer;

export function loaded(args: EventData) {
    page = <Page>args.object;

    page.bindingContext = new SettingsModel();

}