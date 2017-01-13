//除chrome外，其他支持需要在服务器上运行才支持
if(!window.localStorage){
  // alert('This browser does NOT support localStorage');
  alert('此浏览器不支持此抽奖程序，请更换Chrome(谷歌)浏览器');
}

/*
 * config 奖项设置
 * localStorage 存储设置
 * board面板计奖函数
 * key 奖项类别 first second third
 * val 抽奖用户的索引
 */
var config = {
  'switch' : false,
  'awards' : 'third', // 当前奖项
  'keycode': {
    '49': { 'class': 'first',    'name': '一等奖', 'total': 3 }, // 键1
    '50': { 'class': 'second',   'name': '二等奖', 'total': 10 }, // 键2
    '51': { 'class': 'third',    'name': '三等奖', 'total': 20 } // 键3
  },

  get: function( key ) {
    return window.localStorage.getItem( key ) || ''
  },

  set: function( key, val) {
    window.localStorage.setItem( key, val );
  },

  /*
   *移除选定某项
   *去2个以上','  去前后','
   */
  remove: function( key, val ) {
    var key = key || config.awards,
        newval = config.get(key).replace(val, '').replace(/,{2,}/g, ',').replace(/(^,*)|(,*$)/g, '');

    config.set( key,  newval );
  },

  //获取当前奖项locals
  getCur: function() {
    return config.get( config.awards )
  },

  //追加并去掉前后','
  setCur: function( val ) {
    var oldval = config.getCur(),
        newval = [ oldval, val ].join(',').replace(/(^,*)|(,*$)/g, '');

    config.set( config.awards, newval);
  },

  //查询当前是否有中奖记录,避免重复中奖
  query: function( val ) {
    var duplication = false;
    for(var key in window.localStorage){
      if( 'first|second|third'.indexOf(key) >= 0 ){
        if(config.get( key ).indexOf(val) >= 0) {
          duplication = true;
          break;
        }
      }
    }

    return duplication
  },

  //清空设置
  clear: function() {
    window.localStorage.clear()
  },

  //读取本地中奖数据
  reading: function() {
    for(key in config.keycode){
      var awards = config.keycode[key].class,
          locals = config.get(awards);

      if( !!locals ){
        var nums = locals.split(','),
            selector = $('.' + awards);

        for(var i = 0, len=nums.length; i < len; i++){
          config.appear( selector, nums[i] )
        }
      }
    }
  },

  appear: function( selector, num ) {
    var data  = dataSource[ num ],
        code  = selector.find('code'),
        ratio = code.html(),
        min   = ~~/(\d+)\/\d+/.exec(ratio)[1], //已中奖的人数
        max   = ~~/\d+\/(\d+)/.exec(ratio)[1]; //中奖人数上限

    if( min == max ){
      var awards = selector.attr('class').split(/\s+/)[0],
          reg   = new RegExp('(\\d+,*){'+ max +'}'); //"(\d+,*){20}"

      //过滤超过max位
      config.set(awards, reg.exec(config.get(awards))[0].replace(/(^,*)|(,*$)/g, '') )
      return;
    }

    var newItem = selector.find('li:eq(0)').clone().removeAttr('class').attr({'data-num': num}).css({'margin-left': 300});
    newItem.find('.num').html( data[ 'tel' ] );

    if( min > 0 ){
      newItem.prependTo( selector.find('.win') );
    } else {
      newItem.replaceAll( selector.find('li:eq(0)') )
    }

    setTimeout(function(){newItem.css({'margin-left': 0})}, 0) // 插入动画
    code.html( ratio.replace(/^\d+/, min + 1) );
    // 绑定删除事件
    newItem.one('click', 'button', function() {
      var awards = newItem.parent().parent().parent('.active').attr('class').replace('active', '').replace(/^\s*|\s*$/g, '');

      config.remove( awards, newItem.data('num') );
      newItem.css({'transition-delay': 0, 'margin-left': 300});
      code.html( ratio.replace(/^\d+/, ~~/(\d+)\/\d+/.exec(code.html())[1] - 1) );
      setTimeout(function(){
        if( newItem.siblings().length == 0 ) {
          var none = newItem.clone().addClass('none').removeAttr('style');

          none.find('.num').html('***');
          none.find('.avatar img').attr('src', 'img/blank.gif');
          none.find('.name').html('');
          none.prependTo( selector.find('.win') )
        }
        newItem.remove()
      }, 600)
    })
  }
}

config['total'] = dataSource.length;

function getBoots(bogus) {
  var boots = [];
  for(var i=0, len=$('.counter-' + bogus + ' .counter').length; i<len; i++) {
    boots.push(Lucky($('.counter-' + bogus + ' .counter').eq(i).find('ul:not(.none) li')));
  }
  return boots;
}

/*
 * 加载完毕后
 */
function loader() {
  $('#copyleft').fadeOut();
  $('#content, .trigger').addClass('active');

  //空格控制
  var allBoots = {},
      lock = true;

  allBoots.first = getBoots('first');
  allBoots.second = getBoots('second');
  allBoots.third = getBoots('third');

  $(document).on('keydown.lazyloader', function( e ) {
    var boots = allBoots[config.awards];
    // keyCode 32 空格键
    if( e.keyCode == 32 ) {
      if( lock ){
        for(var i=0, len=boots.length; i<len; i++) {
          boots[i].aStart();
        }
        lock = false;
      } else {
        for(var i=0, len=boots.length; i<len; i++) {
          boots[i].lottery();
        }
        lock = true;
      }
    }
  })

}

// args为 count>li
function Lucky( args ){
  var args = args,
      timers = [],
      flicker = $('.flicker > img');

  return {
    //顺序运动
    aStart: function(){
      this.avatar();
      $.each(args, function( i, n ){
        var single = $( n );

        if( single.data( 'bingo' ) == undefined ){
          single.data( 'bingo',  Bingo( single ) );
        }
        timers[ i ] = setTimeout(function(){
          single.data( 'bingo' ).start();
        }, i * 150)
      });

      return !1;
    },

    /*
     *抽奖
     (new Date().getTime() * 9301 + 49297) % 233280 /233280.0 * Max

     ~~(Math.random() * max)
     ~~(Math.random() * (min - max + 1) + max)
     ( new Date().getTime() * 7 - 13 ) % totalCount + 1

       ~~(Math.random()*(max-min+1))

     Math.round( Math.random() * 1000 + .5)
       Math.floor(Math.random() * 730) + 1

     数组排序  [].sort(function () { return 0.5 - Math.random(); })
    */
    lottery: function() {
      for( var x in timers ) {
        try{
          if( timers.length > ~~x + 1 ) {
            clearTimeout( timers[ x ] )
          }
        }catch(e){

        }
      }

      var lucky = this.randit();
          value = [];
      for(var i = 0; i < lucky.length; i++){
        (i < 3) && value.push( lucky.charAt( i ) )
      }
      $.each(args, function(i, n){
        var single = $( n ),
            bingo = single.data( 'bingo' );

        bingo.endTo( ~~value[ i ], i * 200, !i )
      })

      return !0;
    },

    /*
     * 随机抽取！
     */
    randit: function() {
      var result = Math.round( Math.random() * config.total + .5 ) - 1;
          tel = dataSource[ result ][ 'tel' ];

      if( config.query(result) ){
        return this.randit();
      }

      //html5存储序列号
      config.setCur( result );
      setTimeout(function(){
        //停止头像
        clearTimeout( timers[ args.length ] );
        config.appear( $('.' +  config.awards), result )
      }, 1000)

      return tel;
    },

    /*
     * 头像变换
     */
    avatar: function() {
      var result = Math.round( Math.random() * config.total + .5 ) - 1;

      timers[ args.length ] = setTimeout(arguments.callee, 100)
    }
  }
}

/*
 * 摇奖机Bingo
 * 从下至上循环摇动，控制backgroundPositionY
 * arg $对象
 */
function Bingo( arg ) {
  var code = '0659', //网络识别号 [ 2 ]{ 3, 4, 5, 8 } RegExp( /^13[0-9]{9}$|14[0-9]{9}|15[0-9]{9}$|18[0-9]{9}$/ )
      loop = 0,      //循环次数
      running = 0,   //0 - 9
      timer = null;  //控制摇动时间
  /*
   * 增加随机步数selfAuto
   * 保证每次跳跃次数不一致
   * 范围 Math.random() * 10   --  [ 0 - 9 ]
   */
  function selfAuto() {
    running += ~~( Math.random() * 10 );
    format();
  }

  /*
   * 格式化format
   * running 保持0-9区间
   */
  function format() {
    if( running >= 10 ){
      loop ++;
      running -= 10;
    }
  }

  return {
    start: function() {
      selfAuto();
      arg.css({
        'background-position-y': -120 * ( 10 * loop + running ) - 13
      })
      //[50, 100]
      timer = setTimeout( arguments.callee, Math.random() * 50 + 50 )
    },

    stop: function(){
      clearTimeout( timer )
    },
    endTo: function( num, timer ) {
      this.stop();
      timer = timer || 200;
      if( arguments[2] != undefined && arguments[2] ) {
        running = num;
      } else {
        if( num < running ) {
          loop ++;
        }
        running = num;
      }
      arg.animate({
        'background-position-y': -120 * ( 10 * loop + running ) -13
      }, timer)
    }
  }
}

$(document).ready(function() {
  var per = $('#loader .inner');

  $("#loader").addClass("ready");
  per.css('width', '100%');
  setTimeout(function() {
    per.css('transform', 'scale(1, 1)')
  }, 550);
  setTimeout(function(){
    $("#loader").animate({'opacity': 0}, 'fast', function() { $(this).remove() });
    $('#copyleft').addClass('active');
  }, 750);

  setTimeout(loader, 6000);

  // 中奖栏切换
  $('.trigger').on('click', function(){
    if( !$(this).data('active') ){
      $('.zone-container').addClass('active');
      $(this).data('active', true);
    } else {
      $('.zone-container').removeClass('  active');
      $(this).data('active', false);
    }
  });

  // 键盘S键 触发侧边栏切换
  $(window).keydown(function(e){
    if(e.keyCode == "83") {
      $('.trigger').trigger("click")
    }
  });

  config.reading();

  /*
   *更换壁纸、设置全局抽奖奖项
   *键盘操作[1: 一等奖, 2: 二等奖, 3: 三等奖，0: 全显]
   *CTRL + DEL 重置
   */
  $(document).on('keydown', function( e ) {
    var k = config.keycode[ e.keyCode ];
    if( !!k ) {
      config.awards = k.class;
      $('.flicker').hide();
      $('.counter-container').hide();
      $('.counter-' + config.awards).show();
      $('.flicker').show();
      //background change
    } else if (e.keyCode == 48){
      config.awards = 'third';
      // $('.board > div').addClass('active');
    } else if (e.ctrlKey && e.keyCode == 46) {
      config.clear();
      window.location.reload()
    }
  })

  // 动画30帧以上 gif flash css3 js
  // 电影24帧以上

})
