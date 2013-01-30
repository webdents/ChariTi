var APP = require("core");
var UTIL = require("utilities");
var MODEL = require("models/facebook");
var DATE = require("alloy/moment");
var STRING = require("alloy/string");

var CONFIG = arguments[0];
var SELECTED;

var offset = 0;
var refreshLoading = false;
var refreshEngaged = false;

$.init = function() {
	APP.log("debug", "facebook.init | " + JSON.stringify(CONFIG));

	CONFIG.feed = "http://www.facebook.com/feeds/page.php?format=json&id=" + CONFIG.userid;

	APP.openLoading();

	$.retrieveData();

	$.NavigationBar.Wrapper.backgroundColor = APP.Settings.colors.primary || "#000";
	$.NavigationBar.right.visible = true;
	$.NavigationBar.rightImage.image = "/images/settings.png";

	if(CONFIG.isChild === true) {
		$.NavigationBar.back.visible = true;
	}

	if(OS_IOS) {
		var initRefresh = setInterval(function(_event) {
			if(offset > 30) {
				clearInterval(initRefresh);
			}

			$.container.scrollTo(0, 60);
		}, 100);

		$.container.addEventListener("postlayout", function(_event) {
			if(offset <= 60) {
				$.container.scrollTo(0, 60);
			}
		});
	} else {
		$.NavigationBar.left.visible = true;
		$.NavigationBar.leftImage.image = "/images/refresh.png";
	}
};

$.retrieveData = function(_force, _callback) {
	MODEL.fetch({
		url: CONFIG.feed,
		cache: _force ? 0 : CONFIG.cache,
		callback: function() {
			$.handleData(MODEL.getAllArticles());

			if(typeof _callback !== "undefined") {
				_callback();
			}
		}
	});
};

$.handleData = function(_data) {
	APP.log("debug", "facebook.handleData");

	var rows = [];

	for(var i = 0, x = _data.length; i < x; i++) {
		var row = Alloy.createController("facebook_row", {
			id: _data[i].id,
			heading: _data[i].title,
			subHeading: STRING.ucfirst(DATE(parseInt(_data[i].date)).fromNow())
		}).getView();

		rows.push(row);
	}

	$.content.setData(rows);

	APP.closeLoading();

	if(APP.Device.isTablet) {
		SELECTED = _data[0].id;

		APP.addChild("facebook_article", {
			id: _data[0].id
		});
	}
};

// Event listeners
$.Wrapper.addEventListener("APP:screenAdded", function() {
	$.retrieveData();
});

$.NavigationBar.back.addEventListener("click", function(_event) {
	APP.log("debug", "facebook @close");

	APP.removeChild();
});

$.NavigationBar.right.addEventListener("click", function(_event) {
	APP.openSettings();
});

$.content.addEventListener("click", function(_event) {
	APP.log("debug", "facebook @click " + _event.row.id);

	if(APP.Device.isTablet) {
		if(_event.row.id == SELECTED) {
			return;
		} else {
			SELECTED = _event.row.id;
		}
	}

	APP.addChild("facebook_article", {
		id: _event.row.id
	});
});

if(OS_IOS) {
	$.container.addEventListener("scroll", function(_event) {
		if(_event.y !== null) {
			offset = _event.y;

			if(!refreshLoading) {
				var transform = Ti.UI.create2DMatrix();

				if(offset < 0) {
					if(refreshEngaged == false) {
						$.refreshLabel.text = "Release to reload...";

						transform = transform.rotate(-180);

						$.refreshArrow.animate({
							transform: transform,
							duration: 100
						});

						refreshEngaged = true;
					}
				} else {
					if(offset < 60) {
						console.log(UTIL.lastUpdate(CONFIG.feed));
						console.log(parseInt(UTIL.lastUpdate(CONFIG.feed)));

						$.refreshUpdateLabel.text = "Last Updated: " + DATE(parseInt(UTIL.lastUpdate(CONFIG.feed))).fromNow();
					}

					if(refreshEngaged == true) {
						$.refreshLabel.text = "Pull down to update...";

						$.refreshArrow.animate({
							transform: transform,
							duration: 100
						});

						refreshEngaged = false;
					}
				}
			}
		}
	});

	$.container.addEventListener("dragend", function(_event) {
		if(offset < 0) {
			refreshLoading = true;

			$.refreshLabel.text = "Loading new content...";
			$.refreshArrow.visible = false;
			$.refreshLoading.visible = true;

			$.refreshLoading.start();

			$.retrieveData(true, function() {
				refreshLoading = false;

				$.container.scrollTo(0, 60);

				$.refreshArrow.visible = true;
				$.refreshLoading.visible = false;
			});
		} else if(offset < 60 && !refreshLoading) {
			$.container.scrollTo(0, 60);
		}
	});
} else {
	$.NavigationBar.left.addEventListener("click", function(_event) {
		$.retrieveData(true);
	});
}

// Kick off the init
$.init();