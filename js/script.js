/**
 * ownCloud - collabora
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Hugo Gonzalez Labrador (CERN) <hugo.gonzalez.labrador@cern.ch>
 * @copyright Hugo Gonzalez Labrador (CERN) 2017
 */

(function ($, OC, OCA) {	// just put Collabora in global namespace so 

	// just put Collabora in global namespace so 
	// the hack for owncloud 8 for having the new file menu entry can work.
	OCA.Collabora = {};

	var defaultMimes = [
		'application/vnd.oasis.opendocument.text',
		'application/vnd.oasis.opendocument.spreadsheet',
		'application/vnd.oasis.opendocument.graphics',
		'application/vnd.oasis.opendocument.presentation'
	]

	var supportedMimes = [
		'application/vnd.lotus-wordpro',
		'image/svg+xml',
		'application/vnd.visio',
		'application/vnd.wordperfect',
		'application/msonenote',
		'application/msword',
		'application/rtf',
		'text/rtf',
		'text/plain',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
		'application/vnd.ms-word.document.macroEnabled.12',
		'application/vnd.ms-word.template.macroEnabled.12',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
		'application/vnd.ms-excel.sheet.macroEnabled.12',
		'application/vnd.ms-excel.template.macroEnabled.12',
		'application/vnd.ms-excel.addin.macroEnabled.12',
		'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
		'application/vnd.ms-powerpoint',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'application/vnd.openxmlformats-officedocument.presentationml.template',
		'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
		'application/vnd.ms-powerpoint.addin.macroEnabled.12',
		'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
		'application/vnd.ms-powerpoint.template.macroEnabled.12',
		'application/vnd.ms-powerpoint.slideshow.macroEnabled.12'
	]

	var collaboraApp;

	var loadConfig = function() {
		// var url = OC.generateUrl('/apps/collabora/config');
		// $.get(url).success(function (response) {
		// 	OCA.Collabora.endPoints = response;
		// 	collaboraApp = response + "&WOPISrc=";
		// }); 

		//hardcode for now... //TODO
		collaboraApp = "https://collabora.cern.ch:9980/loleaflet/dde4073/loleaflet.html"; //?permission=readonly
	}

	var closeDocument = function (e) {
		e.preventDefault();
		$("#office_container").remove();
		//$("header div#header #office_close_button").remove();
		window.location.hash = '';
		$(window).unbind('popstate', closeDocument);
	};


	var template = '<div id="office_container"><span id="frameholder"></span></div>';

	var setView = function (actionURL, accessToken, filename) {
		var view = template.replace("<OFFICE_ONLINE_ACTION_URL", actionURL);
		view = view.replace("<ACCESS_TOKEN_VALUE>", accessToken);

		$('#content').append(view);

		var frameholder = document.getElementById('frameholder');
		var office_frame = document.createElement('iframe');
		office_frame.name = 'office_frame';
		office_frame.id = 'office_frame';
		// The title should be set for accessibility
		office_frame.title = 'CERNBox Office Online Frame';
		// This attribute allows true fullscreen mode in slideshow view
		// when using PowerPoint Online's 'view' action.
		office_frame.setAttribute('allowfullscreen', 'true');
		office_frame.src = actionURL;
		frameholder.appendChild(office_frame);
	};


	var isPublicPage = function () {

		if ($("input#isPublic") && $("input#isPublic").val() === "1") {
			return true;
		} else {
			return false;
		}
	};

	var getSharingToken = function () {
		if ($("input#sharingToken") && $("input#sharingToken").val()) {
			return $("input#sharingToken").val();
		} else {
			return null;
		}
	};

	var sendOpen = function (basename, data) {
		var canedit = false;
		var permissions = data.$file.attr("data-permissions");
		if (permissions > 1) { // > 1 write permissions
			canedit = true;
		}
		filename = data.dir + "/" + basename;

		var data = {filename: filename};
		var url = "";
		// check if we are on a public page
		if (isPublicPage()) {
			var token = getSharingToken();
			url = OC.generateUrl('/apps/wopiviewer/publicopen');
			data['token'] = token;
			data['folderurl'] = parent.location.protocol+'//'+location.host+OC.generateUrl('/s/')+token+'?path='+OC.dirname(data.filename);
		} else {
			url = OC.generateUrl('/apps/wopiviewer/open');
			data['folderurl'] = parent.location.protocol+'//'+location.host+OC.generateUrl('/apps/files/?dir=' + OC.dirname(data.filename));
		}

		$.post(url, data).success(function (response) {
			if (response.wopi_src) {
				window.location.hash = 'office';
				var viewerURL = collaboraApp + "?WOPISrc=" + encodeURI(response.wopi_src);
				if (canedit) {
					viewerURL += "&permission=edit"
				} else {
					viewerURL += "&permission=readonly"
				}
				// setView(viewerURL, response.wopi_src, basename);
				window.open(viewerURL,'_blank'); //Collabora is preventing the app from being used inside an iframe
			} else {
				console.error(response.error);
			}
		});
	};

	var getUrlParameter = function getUrlParameter (sParam) {
		var sPageURL = decodeURIComponent(window.location.search.substring(1)),
			sURLVariables = sPageURL.split('&'),
			sParameterName,
			i;
		for (i = 0; i < sURLVariables.length; i++) {
			sParameterName = sURLVariables[i].split('=');

			if (sParameterName[0] === sParam) {
				return sParameterName[1] === undefined ? true : sParameterName[1];
			}
		}
	};


	$(document).ready(function () {
		loadConfig();

		if (OCA.Files != null) {
			for (i = 0; i < supportedMimes.length; ++i) {
				OCA.Files.fileActions.register(supportedMimes[i], 'Open in Collabora', OC.PERMISSION_UPDATE, OC.imagePath('collabora', 'app.svg'), sendOpen);
			}
			for (i = 0; i < defaultMimes.length; ++i) {
				OCA.Files.fileActions.register(defaultMimes[i], 'Open in Collabora', OC.PERMISSION_UPDATE, OC.imagePath('collabora', 'app.svg'), sendOpen);
				OCA.Files.fileActions.setDefault(defaultMimes[i], 'Open in Collabora');
			}

			OC.Plugins.register("OCA.Files.NewFileMenu", {
				attach: function (menu) {
					var fileList = menu.fileList;
		
					if (fileList.id !== "files") {
						return;
					}
		
					menu.addMenuEntry({
						id: "odt",
						displayName: t(OCA.Collabora.AppName, "Document (odt)"),
						templateName:  'New document.odt',
						iconClass: "icon-word",
						fileType: "file",
						actionHandler: function (name) {
							// first create the file
							fileList.createFile(name).then(function() {
								// once the file got successfully created,
								// open the editor
								var selector = 'tr[data-file="'+ name +'"]';
								fileList.$container.find(selector).find("span.nametext").click();
							});
						}
					});
		
					menu.addMenuEntry({
						id: "ods",
						displayName: t(OCA.Collabora.AppName, "Spreadsheet (ods)"),
						templateName:  'New Spreadsheet.ods',
						iconClass: "icon-excel",
						fileType: "file",
						actionHandler: function (name) {
							// first create the file
							fileList.createFile(name).then(function() {
								// once the file got successfully created,
								// open the editor
								var selector = 'tr[data-file="'+ name +'"]';
								fileList.$container.find(selector).find("span.nametext").click();
							});
						}
					});
		
					menu.addMenuEntry({
						id: "odp",
						displayName: t(OCA.Onlyoffice.AppName, "Presentation (odp)"),
						templateName:  'New presentation.odp',
						iconClass: 'icon-powerpoint',
						fileType: "file",
						actionHandler: function (name) {
							// first create the file
							fileList.createFile(name).then(function() {
								// once the file got successfully created,
								// open the editor
								var selector = 'tr[data-file="'+ name +'"]';
								fileList.$container.find(selector).find("span.nametext").click();
							});
						}
					});
				}
			});
		}

	});

})(jQuery, OC, OCA);
