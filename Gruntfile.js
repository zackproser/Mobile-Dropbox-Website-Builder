/*global module */

module.exports = function(grunt) {

    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            options: {
                //define the string to go between each file in the concat'd output
                separator: ';'
            },
            dist: {
                //files to concatenate
                src: ['src/**/*.js'],
                //destination js file
                dest: 'build/js/<%= pkg.name %>.js'

            }
        },
        uglify: {
            options: {
                // the banner to stamp at top of output
                banner: '/* <%= pkg.name %> <%= grunt.template.today("dd-mm-yy") %> /* \n'
            },
            dist: {
                files: {
                    'build/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        jshint: {
            //files to lint
            files: ['Gruntfile.js', 'src/**/*.js'],

            options: {
                globals: {
                    jQuery: true,
                    console: true,
                    module: true
                }
            }
        },
        compass: {
            dist: {
                options: {
                	sassDir: 'src/sass',
                	cssDir: 'build/css'
                }
            }
        },
        watch: {
            css: {
                files: 'src/sass/*.scss',
                tasks: ['compass']
            },
            js: {
                files: ['src/js/*.js'],
                tasks: ['jshint', 'uglify', 'concat']
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-compass');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'compass']);

}; //exports