podcasts6
=========

Overview
--------
This is a nodejs application which uses the Google Youtube API and 3rd party tools to download YouTube videos, strip the audio and add them to my personal podcasts feed.

The application is used as follows:
  ./podcasts.js -v <some youtube video id>

This project is the 6th iteration of my podcasts project.

The previous 5 iterations were experiments with BackboneJS and RequireJS in the browser side application using the TodoMVC app as a starting point and reworking it for my own purpose.


What is done?
-------------
* The nodeJS component is working in that it succeeds in doing the following:
  - Querying YouTube API
  - Downloading a Video
  - Stripping the audio
  - Uploading to my own podcasts feed and updating the RSS file.


What is left todo? 
------------------
The browser side application was left as a collection of experiments and explorations in Backbone and Require.

At this point, I need to get back into the client code and get it communicating with the nodejs component.

Also, tidy up the project in general.  Move it from being a collection of experiments to an evolving project!

