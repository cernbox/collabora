/**
 * ownCloud - collabora
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Hugo Gonzalez Labrador (CERN) <hugo.gonzalez.labrador@cern.ch>
 * @copyright Hugo Gonzalez Labrador (CERN) 2017
 */

(function($, OC, OCA) { // just put Collabora in global namespace so

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
    var office_frame;

    var loadConfig = function(to_execute) {
        // For now just use the endpoints provided by wopi
        var url = OC.generateUrl('/apps/wopiviewer/config');
        $.get(url).success(function(response) {
                try {
                    var givenUrl = response['.odt'].view;
                    var match = givenUrl.match(/\/byoa\/collabora\/loleaflet\/(.+)\/loleaflet.html/i)[0];
                    collaboraApp = "https://" + window.location.hostname + match;

                    to_execute();

                } catch (error) {
                    OC.Notification.showTemporary("Failed to load Collabora");
                    console.error('Failed to load Collabora endpoint', error);
                }
            })
            .error(function(error) {
                OC.Notification.showTemporary("Failed to load Collabora");
                console.error('Failed to load Collabora endpoint', error);
            });
    }

    var closeDocument = function(e) {
        office_frame.src = "about:blank"; // force redirect so that the page knows it closed?
        $("#office_container").remove();
        window.location.hash = '';
        $(window).unbind('popstate', closeDocument);
        $('#preview').show();
    };


    var template = '<div id="office_container"><span id="frameholder"></span></div>';

    var setView = function(actionURL, accessToken, isEmbbedded) {
        var view = template.replace("<OFFICE_ONLINE_ACTION_URL", actionURL);
        view = view.replace("<ACCESS_TOKEN_VALUE>", accessToken);

        $('#content').append(view);

        var frameholder = document.getElementById('frameholder');
        office_frame = document.createElement('iframe');
        office_frame.name = 'office_frame';
        office_frame.id = 'office_frame';
        // The title should be set for accessibility
        office_frame.title = 'CERNBox Office Online Frame';
        // This attribute allows true fullscreen mode in slideshow view
        // when using PowerPoint Online's 'view' action.
        office_frame.setAttribute('allowfullscreen', 'true');
        office_frame.src = actionURL;


        if (isEmbbedded) {
            // And start listening to incoming post messages
            window.addEventListener('message', function(e) {
                var msg, msgId;
                try {
                    msg = JSON.parse(e.data);
                    msgId = msg.MessageId;
                    var args = msg.Values;
                    var deprecated = !!args.Deprecated;
                } catch (exc) {
                    msgId = e.data;
                }

                if (msgId === 'UI_Close' || msgId === 'close' /* deprecated */ ) {
                    // If a postmesage API is deprecated, we must ignore it and wait for the standard postmessage
                    // (or it might already have been fired)
                    if (deprecated)
                        return;

                    closeDocument();
                }
            });
        }

        frameholder.appendChild(office_frame);
        $('#preview').hide();
    };


    var isPublicPage = function() {

        if ($("input#isPublic") && $("input#isPublic").val() === "1") {
            return true;
        } else {
            return false;
        }
    };

    var getSharingToken = function() {
        if ($("input#sharingToken") && $("input#sharingToken").val()) {
            return $("input#sharingToken").val();
        } else {
            return null;
        }
    };

    var sendOpen = function(basename, data) {

        if (!collaboraApp) {
            OC.Notification.showTemporary("Failed to load Collabora");
            console.error("Collabora app still didn't load")
            return;
        }

        var path = 'view';
        var permissions = data.$file.attr("data-permissions");
        if (permissions > 1) { // > 1 write permissions
            path = 'edit';
        }
        filename = data.dir + "/" + basename;

        if (isPublicPage()) {
            var token = getSharingToken();
            url = OC.generateUrl('/apps/collabora/public/' + token + '/' + path + filename + '?X-Access-Token=' + getPublicLinkAccessToken());
        } else {
            url = OC.generateUrl('/apps/collabora/' + path + filename);
        }

        window.open(url, '_blank');

    };

    var getPublicLinkAccessToken = function() {
        var data = $("data[key='cernboxauthtoken']");
        return data.attr('x-access-token');
    }

    var _open = function(filename, canedit, iFrame) {
        var data = { filename: filename };
        var url = "";
        var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

        // the link is from a public page (but not a public link preview)
        if (typeof pl_token !== 'undefined') {
            url = OC.generateUrl('/apps/wopiviewer/publicopen');
            data['token'] = pl_token;
            data['folderurl'] = parent.location.protocol + '//' + location.host + OC.generateUrl('/s/') + pl_token + '?path=' + OC.dirname(data.filename);
            headers['X-Access-Token'] = getUrlParameter('X-Access-Token');
        } else if (isPublicPage()) {
            url = OC.generateUrl('/apps/wopiviewer/publicopen');
            var token = getSharingToken();
            data['token'] = token;
            data['folderurl'] = parent.location.protocol + '//' + location.host + OC.generateUrl('/s/') + token + '?path=' + OC.dirname(data.filename);
            headers['X-Access-Token'] = getPublicLinkAccessToken();
        } else {
            url = OC.generateUrl('/apps/wopiviewer/open');
            data['folderurl'] = parent.location.protocol + '//' + location.host + OC.generateUrl('/apps/files/?dir=' + OC.dirname(data.filename));
            headers['X-Access-Token'] = OC["X-Access-Token"];
        }
        
        // Use fetch instead of XMLHttpRequest to avoid having leftoverrs from OC...
        fetch(url, {
            method: 'POST',
            headers: headers,
            body: new URLSearchParams(data)
        }).then(response => response.json())
        .then(function(response) {
            reponse = response;
            if (response.wopi_src) {
                var viewerURL = collaboraApp + "?WOPISrc=" + encodeURI(response.wopi_src);
                if (iFrame) {
                    viewerURL += "&closebutton=1";
                }
                if (!canedit) {
                    viewerURL += "&permission=readonly";
                }
                setView(viewerURL, response.wopi_src, iFrame);
            } else {
                console.error(response.error);
            }
        }, function() {
            $('#loader').html('Failed to load the file. Does it exist?');
        });
    }

    var createFile = function(name, fileList) {
        var dir = fileList.getCurrentDirectory();

        $.post(OC.generateUrl("apps/collabora/new"), {
                    name: name,
                    dir: dir
                },
                function onSuccess(response) {
                    if (response.error) {
                        OC.Notification.showTemporary("Failed to create the Collabora file");
                        console.error('Failed to create Collabora file', response.error);
                        return;
                    }

                    var targetPath = dir + '/' + name;

                    fileList.addAndFetchFileInfo(targetPath, '', { scrollTo: true }).then(function(status, data) {

                        var row = OC.Notification.show(t(OCA.Collabora.AppName, "File created"));
                        setTimeout(function() {
                            OC.Notification.hide(row);
                        }, 3000);

                        var selector = 'tr[data-file="' + name + '"]';
                        fileList.$container.find(selector).find("span.nametext").click();
                    }, function() {
                        OC.Notification.show(t('files', 'Could not create file "{file}"', { file: name }), { type: 'error' });
                    });


                }
            )
            .fail(function(status) {
                if (status === 412) {
                    OC.Notification.show(t('files', 'Could not create file "{file}" because it already exists', { file: name }), { type: 'error' });
                } else {
                    OC.Notification.show(t('files', 'Could not create file "{file}"', { file: name }), { type: 'error' });
                }
                deferred.reject(status);
            });
    };

    var loadPublicLink = function() {

        if (!isPublicPage()) return;

        if (getUrlParameter('closed') === '1') return;

        var mime = $('#mimetype').val();
        var filename = $('#filename').val();

        defaultMimes.forEach(defaultmime => {
            if (mime === defaultmime) {
                _open(filename, false, true);
            }
        })


    }

    var getUrlParameter = function(sParam) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(sParam)
    };


    $(document).ready(function() {

        loadConfig(function() {

            if (typeof open_file !== 'undefined') {
                if (this_app === "collabora") {
                    _open(open_file, open_file_type === "edit", false);
                }
            } else {

                loadPublicLink();
    
                if (OCA.Files != null) {
                    for (i = 0; i < supportedMimes.length; ++i) {
                        OCA.Files.fileActions.register(supportedMimes[i], 'Open in Collabora', OC.PERMISSION_READ, OC.imagePath('collabora', 'app.svg'), sendOpen);
                    }
                    for (i = 0; i < defaultMimes.length; ++i) {
                        OCA.Files.fileActions.register(defaultMimes[i], 'Open in Collabora', OC.PERMISSION_READ, OC.imagePath('collabora', 'app.svg'), sendOpen);
                        OCA.Files.fileActions.setDefault(defaultMimes[i], 'Open in Collabora');
                    }
        
                    OC.Plugins.register("OCA.Files.NewFileMenu", {
                        attach: function(menu) {
                            var fileList = menu.fileList;
        
                            if (fileList.id !== "files") {
                                return;
                            }
        
                            menu.addMenuEntry({
                                id: "odt",
                                displayName: t(OCA.Collabora.AppName, "Document (odt)"),
                                templateName: 'New document.odt',
                                iconClass: "icon-word",
                                fileType: "file",
                                actionHandler: function(name) {
                                    createFile(name, fileList);
                                }
                            });
        
                            menu.addMenuEntry({
                                id: "ods",
                                displayName: t(OCA.Collabora.AppName, "Spreadsheet (ods)"),
                                templateName: 'New Spreadsheet.ods',
                                iconClass: "icon-excel",
                                fileType: "file",
                                actionHandler: function(name) {
                                    createFile(name, fileList);
                                }
                            });
        
                            menu.addMenuEntry({
                                id: "odp",
                                displayName: t(OCA.Collabora.AppName, "Presentation (odp)"),
                                templateName: 'New presentation.odp',
                                iconClass: 'icon-powerpoint',
                                fileType: "file",
                                actionHandler: function(name) {
                                    createFile(name, fileList);
                                }
                            });
                        }
                    });
                }
            }
        });
    });

})(jQuery, OC, OCA);