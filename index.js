var React = require('react-native');
var cleanseHtml = require('cleanse-html');
var LoadWebView = require('./LoadWebView');
var {
  Image,
  Text,
  View,
  LinkingIOS,
  NavigatorIOS,
  WebView,
  StyleSheet
} = React;

var IMAGESTACK = []; //have to put images outside of <Text> objects. just holding them globally for convenience

var HTMLEXPRESSION = "<([a-z]+)(?:\\s[a-z0-9]+(?:\\s*=\\s*(?:'.*?'|\".*?\"|\\d+))?)*[\\s]*>(.*?)<\\/\\1>"; //all html not handled specially
var IMGEXPRESSION = "<img((?:\\s[a-z0-9]+(?:\\s*=\\s*(?:'.*?'|\".*?\"|\\d+))?)*[\\s\\/]*)>"; //images need to be isolated and added to IMAGESTACK
var TAGEXPRESSION = "<\\/?[a-z]+(?:\\s[a-z0-9]+(?:\\s*=\\s*(?:'.*?'|\".*?\"|\\d+))?)*[\\s\\/]*>"; //(loosely) finds html tags (#TestThis)
var HREFEXPRESSION = "<a((?:\\s[a-z0-9]+(?:=(?:'.*?'|\".*?\"))?)*[\\s]*)>(.*?)<\\/a>"; //Links are handled differently

var LEADINGHREF = new RegExp("^" + HREFEXPRESSION,'i');
var LEADINGHTML = new RegExp("^" + HTMLEXPRESSION,'i');
var LEADINGIMG = new RegExp("^" + IMGEXPRESSION, 'i');
var LEADINGTAG = new RegExp("^" + TAGEXPRESSION, 'i');
var LEADINGTXT = new RegExp("^.+?(?=" + TAGEXPRESSION + ")",'i');
var TAGS = new RegExp(TAGEXPRESSION,'i');

var ReactHtml = React.createClass({
  componentWillMount: function() {
    this.renderer = function(html) {
      //This strips script, style, and head and replaces special characters with their respective text equivalents
      //TODO: capture style and integrate settings into the react-native components
      html = cleanseHtml(html,{html:false});
      var self = this;
      var lineBreaks = /<br ?\/?>/g;
      html = html.replace(lineBreaks,'\n');
      var itemArr = [];

      function preParse(str){
        if(IMAGESTACK.length > 0){
          for(var i = 0; i < IMAGESTACK.length; i++){
            itemArr.push(IMAGESTACK[i]);
          }
          IMAGESTACK=[];
        }
        if(str === "") return itemArr;
        if(str.match(LEADINGHTML)){
          str = str.replace(LEADINGHTML,function(a,b,c){
            itemArr.push(self.parseHTML(a));
            return "";
          });
          return preParse(str);
        }if(str.match(LEADINGIMG)){
          str = str.replace(LEADINGIMG,function(a,b,c){
            itemArr.push(self.parseHTML(a));
            return "";
          });
          return preParse(str);
        }else if(str.match(LEADINGTXT)){
          str = str.replace(LEADINGTXT,function(a,b,c){
            itemArr.push(React.createElement(Text, {}, a));
            return "";
          });
          return preParse(str);
        }else{
          itemArr.push(React.createElement(Text, {}, str));
          return itemArr;
        }
      }
      return preParse(html);
    };
  },
  parseHTML: function(str) {
    /* Because <Text> can't contain nested images, I'm adding them to a stack
       to empty out at the end of each <Text> block. (better way?)*/
    var self = this;
    if(str.match(LEADINGIMG)){
      var imgAttrObj = {};
      var imgAttributes = LEADINGIMG.exec(str);
      var imgAttrArr = ['src','width','height']; //Expand?
      if(imgAttributes)
        for(var i=0; i<imgAttrArr.length; i++){
          var expression = "\\s" + imgAttrArr[i] + "=([\"'])?([^\\s]+)\\1";
          var regex = new RegExp(expression,'i');
          var regexArr = regex.exec(imgAttributes[1]);
          if(regexArr){
            imgAttrObj[imgAttrArr[i]] = regexArr[2];
          }
        }
      if(imgAttrObj.src && imgAttrObj.width && imgAttrObj.height){
        //NOTE: Assigning default width/height values for testing.. Production should only include images with values provided
        //Comment out width/height requirements above to test
        IMAGESTACK.push(React.createElement(Image, {
          source: {uri: imgAttrObj.src},
          style: {
            width: parseInt(imgAttrObj.width) | 300,
            height: parseInt(imgAttrObj.height) | 400
          }
        }));
      }
      if(str.match(new RegExp("^" + IMGEXPRESSION + "$",'i'))){ //str is only an image
        return;
      } else {
        this.parseHTML(str.replace(LEADINGIMG,"")); //remove image and continue processing str
      }
    }
    /*Hyperlinks*/
    if(str.match(LEADINGHREF)){
      var linkObj = null;
      var linkCopy = null;
      str = str.replace(LEADINGHREF, function(a,b,c){ //fn(matchedResult, $1, $2)
        linkCopy = c;
        var linkAttrObj = {style: self.state.styles.a};
        var linkAttrArr = ['href']; //Expand?
        if(b !== "") //b = attributes
          for(var i=0; i<linkAttrArr.length; i++){
            var expression = "\\s" + linkAttrArr[i] + "=[\"']([^\\s]+)[\"']";
            var regex = new RegExp(expression,'i');
            var regexArr = regex.exec(b);
            if(regexArr) linkAttrObj[linkAttrArr[i]] = regexArr[1];
          }

        if(linkAttrObj.href && self.props.navigator){ //Just rendering plain text for links if navigator is missing
          linkAttrObj.linkCopy = linkCopy;
          linkObj = {
            style: self.state.styles.a,
            onPress: () => self.loadWebView(linkAttrObj)
          };
        }
        return "";
      });
      var copyTest = linkCopy.match(TAGS);
      if(copyTest && linkObj){ //nested html in <a>
        if(str === "")
          return React.createElement(Text, linkObj, this.parseHTML(linkCopy));
        else{
          return React.createElement(Text,{},
              React.createElement(Text, linkObj, this.parseHTML(linkCopy)),
              this.parseHTML(str)
            );
        }
      }else if(linkObj){
        if(str === ""){
          return React.createElement(Text, linkObj, linkCopy);
        }else{
          return React.createElement(Text,{},
              React.createElement(Text, linkObj, linkCopy),
              this.parseHTML(str)
            );
        }
      }else if(linkCopy && linkCopy !== ""){ //treating <a> tags with href attribute but with link copy as standard html
        if(str === ""){
          return React.createElement(Text, {}, linkCopy);
        }else{
          return React.createElement(Text,{},
              React.createElement(Text, {}, linkCopy),
              this.parseHTML(str)
            );
        }
      }
      if(str === "") return;
    }

    /*leading html*/
    else if(str.match(LEADINGHTML)){
      var optionObj = {};
      str = str.replace(LEADINGHTML, function(a,b,c){ //fn(matchedResult, $1, $2)
        if (self.state.styles[b.toLowerCase()])
          optionObj.style = self.state.styles[b.toLowerCase()];
        if(b.toLowerCase() === 'li') //TODO: Add more logic here for other tags
          return '\n\t' + c;
        return c;
      });
      if(str.match(TAGS)){ //Looking for nested tags
        return React.createElement(Text, optionObj, this.parseHTML(str));
      } else{
        return React.createElement(Text, optionObj, str);
      }
    }

    /*Text followed by html*/
    else if(str.match(LEADINGTXT)){
      var plainText = str.match(LEADINGTXT)[0];
      str = str.replace(LEADINGTXT,"");
      return React.createElement(Text, {},
          React.createElement(Text, {}, plainText),
          this.parseHTML(str)
        );
    }

    else{
      return React.createElement(Text, {}, str); //There shouldn't be anything but text if it makes it to here (?)
    }
  },
  loadWebView: function(link) {
    this.props.navigator.push({
      title: link.href,
      component: LoadWebView,
      passProps: {link},
    });
  },
  render: function() {
    if(this.props.children){
      return <View style={this.state.styles.parent}>{ this.renderer(this.props.children) }</View>;
    } else {
      return <View><Text>There was a problem loading content. Please try again.</Text></View>;
    }
  },
  getInitialState: function(){
    return{
      styles: Object.assign({}, defaultStyles, this.props.stylesheet)
    };
  }
});
var defaultStyles = StyleSheet.create({//simple html styling .. will expand later
  parent: {fontSize: 15},
  children: {},
  a: {color: 'blue'},
  b: {fontWeight: '500'},
  strong: {fontWeight: '500'},
  blockquote: {paddingHorizontal: 15},
  i: {fontStyle: 'italic'},
  em: {fontStyle: 'italic'},
  p: {marginTop: 10}
});
module.exports = ReactHtml;
