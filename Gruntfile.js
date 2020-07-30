/*jshint node:true*/

var path = require('path');

module.exports = function(grunt) {
	'use strict';

	require('load-grunt-tasks')(grunt);

    var packageJSON = grunt.file.readJSON('package.json');

	grunt.initConfig({
		webfont: {
            Catmoji: {
                src: 'build/glyphs/*.svg',
                dest: 'build/raw-font',
                options: {
                    font: 'Catmoji',
                    types: 'ttf',
                    autoHint: false,
                    execMaxBuffer: 1024 * 1000,
                    version: packageJSON.version,
                    codepointsFile: 'build/codepoints.js'
                }
            },
		},
	});

	grunt.loadNpmTasks('grunt-webfont');

	grunt.registerTask('default', ['webfont']);
};
