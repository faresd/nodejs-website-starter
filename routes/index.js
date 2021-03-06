var prismic = require('../prismic-helpers');
var social = require('../includes/social');
var pages = require('../includes/pages');

// -- Display all documents

exports.index = prismic.route(function(req, res, ctx) {
  var homeId = ctx.api.bookmarks['home']
  getPageById(homeId, ctx, req , res, function(doc) {
    handelPage(doc, req, res, ctx)
  })
});


function toCamelcase(name) {
  return name.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase()})
};

function buildMixinName(sliceType, sliceLabel) {
  var fs = require('fs')
  var path = require('path')
  var labeledFileExists = fs.existsSync(path.resolve('views/slices/' + sliceType + '-' + sliceLabel + '.jade'))
  var mixinWithLabel = toCamelcase(sliceType + '-' + sliceLabel)
  var mixinName = (labeledFileExists ? mixinWithLabel : toCamelcase(sliceType))
  return mixinName;

}

function socialPluginEnabled(doc) {
  var socialEnabled = doc.getText(doc.type + '.social_cards_enabled');
  return (socialEnabled == 'Enabled');
}

function getPageByUid(uid, ctx, req, res, callback) {
  ctx.api.forms('everything').ref(ctx.ref)
      .query('[[:d = at(my.page.uid,"' + uid + '")]]').submit(function(err, docs) {
        if (err) { prismic.onPrismicError(err, req, res); return; }
        if (docs.results && docs.results.length <= 0 ){
          res.status(404)
              .send('Not found');
        }
        else if (docs.results[0].uid == uid) {
          callback(docs.results[0])
        } else res.redirect(("/" + docs.results[0].uid))
      })
}


function getPageById(id, ctx, req, res, callback) {
  ctx.api.forms('everything').ref(ctx.ref)
    .query('[[:d = at(document.id,"' + id + '")]]').submit(function(err, docs) {
      console.log(docs, "docs")
      if (err) { prismic.onPrismicError(err, req, res); return; }
      if (docs.results && docs.results.length <= 0 ){
        res.status(404)
          .send('Not found');
      }
      else if (docs.results[0].id == id) {
        callback(docs.results[0])
      } else res.redirect(("/" + docs.results[0].uid))
    })
}

function handelPage(doc, req, res, ctx) {
    prismic.getAllPages(ctx, function(errors, allPages) {
      if (errors[0]) { prismic.onPrismicError(errors[0], req, res); return; }
      var slices =  doc.getSliceZone("page.body").value
      prismic.home(ctx, 'home', function(home) {
        res.render('page', {
          doc: doc,
          slices: slices,
          helpers: {
            buildMixinName:buildMixinName,
            socialPluginEnabled:socialPluginEnabled(doc),
            pageUrl: social.pageUrlFromRequest(req),
            social: social,
            pages: pages
          },
          allPages: allPages,
          home: home
        })
      });
  })
}

exports.page = prismic.route(function(req, res, ctx) {
  var parentUid = req.params['uid']
  var subUid = req.params['subuid']
  //[Todo: a quick solution to handle a child page, should introduce a better dynamic way to handel multiple levels children]
  var pageUid = subUid? subUid : parentUid
  getPageByUid(pageUid, ctx, req, res, function(doc) {
    handelPage(doc, req, res, ctx)
  })
});

// -- Preview documents from the Writing Room

exports.preview = prismic.route(function(req, res, ctx) {
  var token = req.query['token'];

  if (token) {
    ctx.api.previewSession(token, ctx.linkResolver, '/', function(err, url) {
      res.cookie(prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(301, url);
    });
  } else {
    res.send(400, "Missing token from querystring");
  }
});
