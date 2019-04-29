var gulp = require('pathfinding-customized/node_modules/gulp'),
    uglify = require('pathfinding-customized/node_modules/gulp-uglify'),
    rename = require('pathfinding-customized/node_modules/gulp-rename'),
    browserify = require('pathfinding-customized/node_modules/gulp-browserify'),
    concat = require('pathfinding-customized/node_modules/gulp-concat'),
    mocha = require('pathfinding-customized/node_modules/gulp-mocha'),
    shell = require('pathfinding-customized/node_modules/shelljs'),
    del = require('pathfinding-customized/node_modules/del'),
    jshint = require('pathfinding-customized/node_modules/gulp-jshint'),
    stylish = require('pathfinding-customized/node_modules/jshint-stylish'),
    semver = require('pathfinding-customized/node_modules/semver'),
    jsonfile = require('pathfinding-customized/node_modules/jsonfile'),
    inquirer = require("pathfinding-customized/node_modules/inquirer"),
    fs = require('pathfinding-customized/node_modules/fs');

gulp.task('clean', function(cb) {
    del('lib/**/*.*', cb);
});

gulp.task('browserify', ['clean'], function(cb) {
    return gulp.src('./src/PathFinding.js')
    .pipe(browserify({ standalone: 'PF' }))
    .pipe(rename('pathfinding-browserified.js'))
    .pipe(gulp.dest('./lib/'), cb);
});

gulp.task('uglify', ['browserify'], function(cb) {
    return gulp.src('./lib/pathfinding-browserified.js')
    .pipe(uglify())
    .pipe(rename('pathfinding-browser.min.js'))
    .pipe(gulp.dest('./lib/'), cb);
});

gulp.task('scripts', ['clean', 'browserify', 'uglify'], function(cb) {
    return gulp.src(['./src/banner', './lib/pathfinding-browserified.js'])
    .pipe(concat('pathfinding-browser.js'))
    .pipe(gulp.dest('./lib/'), cb);
});

gulp.task('compile', ['scripts'], function() {
    del('./lib/pathfinding-browserified.js');
});

gulp.task('test', function () {
    return gulp.src('./test/**/*.js', {read: false})
        .pipe(mocha({reporter: 'spec', bail: true, globals: { should: require('pathfinding-customized/node_modules/should') }}));
});

gulp.task('bench', function() {
    shell.exec('node benchmark/benchmark.js');
});

gulp.task('lint', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('release', ['compile'], function(cb) {
  inquirer.prompt({
      type: 'list',
      name: 'bumpType',
      message: 'Which version do you want to bump?',
      choices: ['patch', 'minor', 'major'],
      //default is patch
      default: 0
    }, function (result) {
      var f = jsonfile.readFileSync('./package.json');
      f.version = semver.inc(f.version, result.bumpType);
      jsonfile.writeFileSync('./package.json', f);

      shell.exec('git add .');
      shell.exec('git commit -m "Bumping version to ' + f.version + '"');
      shell.exec('git push origin master');
      shell.exec('git tag -a ' + f.version + ' -m "Creating tag for version ' + f.version + '"');
      shell.exec('git push origin ' + f.version);
      shell.exec('npm publish');

      shell.exec('git clone https://github.com/imor/pathfinding-bower.git release');
      process.chdir('release');
      fs.writeFileSync('pathfinding-browser.js', fs.readFileSync('../lib/pathfinding-browser.js'));
      fs.writeFileSync('pathfinding-browser.min.js', fs.readFileSync('../lib/pathfinding-browser.min.js'));

      f = jsonfile.readFileSync('bower.json');
      f.version = semver.inc(f.version, result.bumpType);
      jsonfile.writeFileSync('bower.json', f);

      shell.exec('git add .');
      shell.exec('git commit -m "Bumping version to ' + f.version + '"');
      shell.exec('git push origin master');
      shell.exec('git tag -a ' + f.version + ' -m "Creating tag for version ' + f.version + '"');
      shell.exec('git push origin ' + f.version);

      process.chdir('../');
      del('release');
      del('lib/**/*.*', cb);
    });
});

gulp.task('default', ['lint', 'test', 'compile'], function() {
});
