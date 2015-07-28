'use strict';

var React = require('react-native');
var {
  StyleSheet,
  Text,
  NavigatorIOS,
  View,
  WebView,
} = React;

var HEADER = '#E0B32B';
var BGWASH = 'rgba(255,255,255,0.8)';

var WEBVIEW_REF = 'webview';

var LoadWebView = React.createClass({

  getInitialState: function() {
    return {
      url: this.props.link.href,
      status: 'No Page Loaded',
      backButtonEnabled: false,
      forwardButtonEnabled: false,
      loading: true,
      scalesPageToFit: true,
    };
  },

  render: function() {
    return (
      <View style={[styles.container]}>
        <WebView
        contentInset={{top:-215,right:0,bottom:0,left:0}}
          ref={WEBVIEW_REF}
          automaticallyAdjustContentInsets={false}
          style={styles.webView}
          url={this.state.url}
          javaScriptEnabledAndroid={true}
          onNavigationStateChange={this.onNavigationStateChange}
          startInLoadingState={true}
          scalesPageToFit={this.state.scalesPageToFit}/>
      </View>
    );
  },
});

var styles = StyleSheet.create({
  container: {
    marginTop: 65,
    flex: 1,
    backgroundColor: HEADER,
  },
  webView: {
    backgroundColor: BGWASH,
    height: 350,
  }
});

module.exports = LoadWebView
