"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var page_1 = require("ui/page");
var enums_1 = require("ui/enums");
var frame = require("ui/frame");
function animateShow() {
    return new Promise(function (resolve, reject) {
        var view = frame.topmost().currentPage;
        var dimmer = page_1.getViewById(view, 'picker_dimmer');
        var picker = page_1.getViewById(view, 'picker_holder');
        dimmer.opacity = 0;
        dimmer.animate({
            opacity: 1,
            duration: 500,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(function () {
            resolve();
        });
        picker.opacity = 0;
        picker.scaleX = .7;
        picker.scaleY = .7;
        picker.animate({
            opacity: 1,
            scale: { x: 1, y: 1 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        });
    });
}
exports.animateShow = animateShow;
function animateHide() {
    return new Promise(function (resolve, reject) {
        var view = frame.topmost().currentPage;
        var dimmer = page_1.getViewById(view, 'picker_dimmer');
        var picker = page_1.getViewById(view, 'picker_holder');
        dimmer.animate({
            opacity: 0,
            duration: 500,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(function () {
            resolve();
        });
        picker.animate({
            opacity: 0,
            scale: { x: .7, y: .7 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        });
    });
}
exports.animateHide = animateHide;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsZ0NBQTRDO0FBRzVDLGtDQUEwQztBQUMxQyxnQ0FBa0M7QUFJbEM7SUFFSSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtRQUMvQixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQ3ZDLElBQUksTUFBTSxHQUE0QixrQkFBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN6RSxJQUFJLE1BQU0sR0FBNEIsa0JBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLE9BQU8sQ0FBc0I7WUFDaEMsT0FBTyxFQUFFLENBQUM7WUFDVixRQUFRLEVBQUUsR0FBRztZQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDdEQsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNKLE9BQU8sRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLENBQUMsT0FBTyxDQUFzQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQztZQUNWLEtBQUssRUFBRSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztZQUNuQixRQUFRLEVBQUUsR0FBRztZQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDdEQsQ0FBQyxDQUFBO0lBRU4sQ0FBQyxDQUFDLENBQUE7QUFHTixDQUFDO0FBM0JELGtDQTJCQztBQUVEO0lBQ0ksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDL0IsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQztRQUN2QyxJQUFJLE1BQU0sR0FBNEIsa0JBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekUsSUFBSSxNQUFNLEdBQTRCLGtCQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxPQUFPLENBQXNCO1lBQ2hDLE9BQU8sRUFBRSxDQUFDO1lBQ1YsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDSixPQUFPLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLE9BQU8sQ0FBc0I7WUFDaEMsT0FBTyxFQUFFLENBQUM7WUFDVixLQUFLLEVBQUUsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUM7WUFDckIsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQztBQW5CRCxrQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYWdlLCBnZXRWaWV3QnlJZCB9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHsgU3RhY2tMYXlvdXQgfSBmcm9tICd1aS9sYXlvdXRzL3N0YWNrLWxheW91dCc7XG5pbXBvcnQgeyBBbmltYXRpb25EZWZpbml0aW9uIH0gZnJvbSBcInVpL2FuaW1hdGlvblwiO1xuaW1wb3J0IHsgQW5pbWF0aW9uQ3VydmUgfSBmcm9tIFwidWkvZW51bXNcIjtcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhbmltYXRlU2hvdygpIHtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICBsZXQgdmlldyA9IGZyYW1lLnRvcG1vc3QoKS5jdXJyZW50UGFnZTsgICAgXG4gICAgICAgIGxldCBkaW1tZXI6U3RhY2tMYXlvdXQgPSA8U3RhY2tMYXlvdXQ+Z2V0Vmlld0J5SWQodmlldywgJ3BpY2tlcl9kaW1tZXInKTtcbiAgICAgICAgbGV0IHBpY2tlcjpTdGFja0xheW91dCA9IDxTdGFja0xheW91dD5nZXRWaWV3QnlJZCh2aWV3LCAncGlja2VyX2hvbGRlcicpO1xuICAgICAgICBkaW1tZXIub3BhY2l0eSA9IDA7XG4gICAgICAgIGRpbW1lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcGlja2VyLm9wYWNpdHkgPSAwO1xuICAgICAgICBwaWNrZXIuc2NhbGVYID0gLjc7XG4gICAgICAgIHBpY2tlci5zY2FsZVkgPSAuNztcbiAgICAgICAgcGlja2VyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIHNjYWxlOiB7eDogMSwgeTogMX0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH0pXG4gICAgXG4gICAgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmltYXRlSGlkZSgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgbGV0IHZpZXcgPSBmcmFtZS50b3Btb3N0KCkuY3VycmVudFBhZ2U7ICAgIFxuICAgICAgICBsZXQgZGltbWVyOlN0YWNrTGF5b3V0ID0gPFN0YWNrTGF5b3V0PmdldFZpZXdCeUlkKHZpZXcsICdwaWNrZXJfZGltbWVyJyk7XG4gICAgICAgIGxldCBwaWNrZXI6U3RhY2tMYXlvdXQgPSA8U3RhY2tMYXlvdXQ+Z2V0Vmlld0J5SWQodmlldywgJ3BpY2tlcl9ob2xkZXInKTtcbiAgICAgICAgZGltbWVyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgc2NhbGU6IHt4OiAuNywgeTogLjd9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgIH0pXG59Il19