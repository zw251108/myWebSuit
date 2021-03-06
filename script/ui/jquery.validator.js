/**
 * @fileOverview    基于 jQuery 的 validator 插件
 * @author  ZwB
 * @version 1.0
 * @function    $.validator
 * @param   {object}
 *  selector    {string|object} 需要验证的表单对象
 *  normal      {function}      重置表单时的操作
 *  focus       {function}      表单项获得焦点时的操作
 *  wrong       {function}      表单项未通过验证时的操作
 *  right       {function}      表单项通过验证时的操作
 * @return  {object}(jQuery)    参数 selector 所对应的 jQuery 对象
 * @description
 *  validType       验证类型 对象集合 每一个属性都是一种验证类别 每一个属性对应一个对象
        该对象中的属性名 对应着执行验证的方法 值为提示信息
        For Example：

 *  validMethods    验证方法 对象集合 每一个方法都是使用 apply 方式被调用，方法中的 this 是进行验证的 jQuery 对象
 * @example
 *  JS 代码：
    $(function(){
        $.validator.validType.username = {// 用户名 验证配置
            type: ['required', '请填写用户名'],
            trim: true, // 验证时对值进行 trim
            focus: '请输入6~12位数字、字母、下划线组合，并以字母开头', // 获得焦点时的操作
            valid:[
                ['regexp', /^[a-z]/i],
                ['regexp', /^[a-z0-9_]$/i],
                ['length', 6, 20],
                ['ajax', 'url', '']
            ],
            text:['只能字母开头', '只能输入数字、字母、下划线组合', '只能输入6~12位字符', '该用户名已被注册，请尝试其他用户名'],
            right:'',
            callback:function(rs){alert(rs?'通过验证':'未通过验证')} // 验证后的回调函数
        };

        var $userNameForm = $.validator({
            selector: '#userNameForm',
            normal:function(txt){
                this.next().empty();
            },
            focus:function(txt){
                this.next().html( txt );
            },
            wrong:function(txt){
                alert(txt);
            },
            right:function(txt){
                alert('通过验证');
            }
        });
    })
 *  HTML 代码:
    <form id="userNameForm" action="">
        <input type="text" name="username" id="username" data-validator="username" /><span></span>
    </form>
 */
;(function($){
    var methods = {
        valid:function(){
            var $items = this.formItems,
                i = $items.length,
                validType = $.validator.validType,
                $item, type,
                result = true;

            while( i-- ){
                $item = $items.eq(i);
                type = $item.data('validator');

                if( typeof type === 'string' ){
                    type = validType[type] || {};

                    $item.data('validator', type);
                }

                result = this.triggerHandler('valid', [$item, type]) && result;
            }

            return result;
        },
        reset:function(){// 重置表单
            var $items = this.formItems,
                i = $items.length,
                normal = this.validOpts.normal;

            this.get(0).reset();// 重置表单项的值

            while( i-- ){
                normal.apply( $items.eq(i) );
            }
        },
        result:function(){// 返回表单数据
            var array = this.serializeArray(),
                data = {},
                temp,
                i = array.length;
            while( i-- ){
                temp = array[i];
                if( temp.name in data ){
                    data[temp.name] += ','+ temp.value;
                }
                else{
                    data[temp.name] = temp.value;
                }
            }
            return data;
        }
    };

    $.validator = function(options){
        var opts = $.extend({}, $.validator.defaults, options),
            $form = opts.selector,
            validator = $.validator,
            validType = validator.validType,
            validMethods = validator.validMethods,
            validTrigger = function(){
                var $self = $form.formItems.filter(this),
                    type = $self.data('validator');

                if( typeof type === 'string' ){
                    type = validType[type] || {};

                    $self.data('validator', type);
                }

                $form.triggerHandler('valid', [$self, type]);
            };

        $form = (typeof $form === 'object' && $form.jQuery) ? $form : $($form);

        $form.on({
            submit:function(e){
                var rs = $form.valid();
                if( !rs ){
                    e.stopImmediatePropagation();
                }
                return rs;
            },
            valid:function(e, $item, type){
                var methods = type.valid || [],
                    i = 0,
                    j = methods.length,
                    validTemp,
                    validName,
                    validText,
                    result = true,
                    isValid = true,
                    isRequired = false,
                    wrong = opts.wrong,
                    required = validMethods.required;

                if( 'trim' in type ){
                    $item.val(function(){
                        return $.trim( this.value );
                    });
                }

                if( 'type' in type ){// 验证类型
                    isRequired = true;
                    validTemp = type.type.slice(0);
                    validName = validTemp.shift();
                    validText = validTemp.pop();

                    if( validName === 'required' ){// 必填验证
                        isValid = required.call($item);
                    }
                    else if( validName === 'or' ){// 多选一验证
                        if( !required.call($item) ){
                            isValid = false;
                            isRequired = !validMethods.or.apply($item, validTemp);
                        }
                    }
                    else if( validName === 'and' ){// 多项同时填写
                        isValid = required.call($item) && validMethods.and.apply($item, validTemp);
                    }
                    result = isValid;
                }
                else{// 未设置 为选填
                    isValid = required.call($item);
                }

                if( isValid ){// 继续验证
                    for(; i<j; i++){
                        validTemp = methods[i].slice();
                        validName = validTemp.shift();
                        result = validMethods[validName].apply($item, validTemp) && result;
                        if( !result ){
                            wrong.call($item, type.text[i] || type.text[0]);
                            break;
                        }
                    }
                }
                else{
                    if( isRequired ){
                        wrong.call($item, validText);
                    }
                    else{
                        opts.normal.call($item);
                    }
                    result = false;
                }

                if( result ){// 通过验证
                    if( 'right' in type && isValid ){
                        opts.right.call($item, type.right);
                    }
                    else{
                        opts.normal.call($item);
                    }
                }
                if( 'callback' in type ){
                    type.callback.call($item, result);
                }

                return result;
            }
        }).on('focus', '[data-validator]', function(){
            var $self = $form.formItems.filter(this),
                type = $self.data('validator');

            if( typeof type === 'string' ){
                type = validType[type] || {};

                $self.data('validator', type);
            }

            if( ('focus' in type) && ('focus' in opts) ){
                opts.focus.call($self, type.focus);
            }
        })
            .on('blur', ':text[data-validator], :password[data-validator], textarea[data-validator]', validTrigger)
            .on('click', ':radio[data-validator], :checkbox[data-validator]', validTrigger)
            .on('change', 'select[data-validator]', validTrigger);

        $form.validOpts = opts;
        $form.formItems = $form.find('[data-validator]');

        $.extend($form, methods);

        return $form;
    };

    $.validator.defaults = {
        selector:'',
        focus:null,
        wrong:null,
        right:null,
        normal:null
    };
    $.validator.validType = {};
    $.validator.validMethods = {
        /**
         *  必填项验证
         * */
        required:function(){// 验证是否为空
            var result = false;
            if( this.is(':radio, :checkbox') ){
                result = this.parents('form')
                    .find('input[data-validator][name="'+ this.attr('name') +'"]:checked').length > 0;
            }
            else{
                result = !!this.val();
            }
            return result;
        },
        or:function(){// n 个中选择 1 个填写
            var required = $.validator.validMethods.required,
                result = false,
                argc = arguments.length,
                $form = this.parents('form'),
                i = 0;
            if( argc < 1 ){
                alert("参数设置错误");
                result = false;
            }
            else{
                for(; i < argc; i++){
                    result = required.apply( $form.find( arguments[i] ) ) || result;
                    if( result ) break;
                }
            }
            return result;
        },
        and:function(){// 检测当前标签与目标标签同时不为空，参数至少 1 个 为 jquery 选择器
            var required = $.validator.validMethods.required,
                result = required.apply( this),
                argc = arguments.length;
            if( argc < 1 ){
                console && console.log && console.log("参数设置错误");
                result = false;
            }
            else{
                for(var i=0; i<argc; i++){
                    if( !result ) break;
                    result = result && required.apply( $(arguments[i]) );
                }
            }
            return result;
        },
        /**
         *  特殊标签验证
         * */
        select:function(min, max){
        // 检测设置了 multiple 属性的 select 标签的可选个数，至少 1 个参数，参数 1 为最小选择个数，参数 2 为最大选择个数（可选），其余参数忽略
            var result = false;
            if (!this.is('select') || this.attr('multiple') !== 'multiple') {
            // 不是 select 标签或 select 标签没有 multiple 属性
                console && console.log && console.log("标签设置错误");
            }
            else {
                var argc = arguments.length;
                var numSelect = this.find(':selected').length;
                if (argc === 1) {
                    result = (numSelect >= min);
                }
                else if (argc > 1) {
                    result = ( numSelect >= min && numSelect <= max );
                }
                else {
                    console && console.log && console.log('参数设置错误');
                }
            }
            return result;
        },
        checkbox:function(min, max){
        // 检测 checkbox 的可选个数，至少 1 个参数，参数 1 为最小选择个数，参数 2 为最大选择个数（可选），其余参数忽略
            var result = false;
            if( !this.is(':checkbox') ){
                console && console.log && console.log("标签错误");
            }
            else{
                var argc = arguments.length,
                    name = this.attr("name"),
                    numCheck = this.parents('form')
                        .find('input[name="'+name+'"][data-validator]:checkbox:checked').length;
                if( argc === 1 ){
                    result = ( numCheck >= min );
                }
                else if( argc > 1 ){
                    result = (numCheck >= min && numCheck <= max);
                }
                else{
                    console && console.log && console.log('参数设置错误');
                }
            }
            return result;
        },
        /**
         *  字符串类型验证
         * */
        length:function(min, max){// 检测字符串长度，至少 1 个参数，参数 1 为最小长度，参数 2 为最大长度（可选），其余参数忽略
            var result = false,
                argc = arguments.length,// 获取参数数组长度
                length = this.val().length;

            if (argc === 1) {
                result = (length >= min );
            }
            else if (argc > 1) {
                result = ( length >= min && length <= max );
            }
            else {
                console && console.log && console.log('未知异常');
            }
            return result;
        },
        regexp:function(reg){// 检测是否非法字符，reg 为正则表达式规则 默认值为 /^[a-z0-9_]*$/i
            reg = reg || /^[a-z0-9_]*$/i;
            return reg.test(this.val());
        },
        equal:function(selector){// 检测与目标标签的 value 是否相等，参数 selector 为 jquery 选择器
            var result = false,
                $temp = $(selector || '');
            if($temp.length ){
                result = ( this.val() === $temp.val() );
            }
            else{
                console && console.log && console.log('参数设置错误');
            }
            return  result;
        },
        unequal:function(selector){// 检测与目标标签的 value 是否不相等 参数 selector 为 jquery 选择器
            var result = false,
                $temp = $(selector || '');
            if( $temp.length ){
                result = ( this.val() !== $temp.val() );
            }
            else{
                console && console.log && console.log('参数设置错误')
            }
            return result;
        },
        /**
         *  数字类型验证
         * */
        isNumber:function(){
            return /^-?\d+\.?\d*$/.test(this.val());
        },
        limit:function(min, max){// 检测数值大小，至少 1 个参数，参数 1 为最小值，参数 2 为最大值（可选），其余参数忽略
            var result = false,
                argc = arguments.length,// 获取参数数组长度
                value = Number(this.val());
            if (argc === 1) {
                result = ( value >= min );
            }
            else if (argc > 1) {
                result = ( value >= min && value <= max );
            }
            else {
                console && console.log && console.log('参数设置错误');
            }
            return result;
        },
        decimal:function(digit, size){
        // 检测浮点型数值，至少 1 个参数，参数 1 为小数点右侧的最大位数，参数 2 为数字的最大位数（可选），其余参数忽略
            var result = false,
                argc = arguments.length,// 获取参数数组长度
                reg, temp;
            if (argc === 1) {
                reg = new RegExp('^-?\d+\.?\d{0,'+ digit +'}$');
                result = reg.test(this.val());
            }
            else if (argc > 1) {
                temp = size - digit;
                reg = new RegExp('^-?\d'+ (temp >= 1 ? '{1'+ (temp === 1 ? '' : ','+ temp ) +'}' : '+')
                    +'\.?\d{0,'+ digit +'}$');
                result = reg.test(this.val());
            }
            else {
                console && console.log && console.log('参数设置错误');
            }
            return result;
        },
        exponent:function(){// 检测指数数值
            return /^-?\d+(?:\.\d*)?(?:e[+\-]?\d+)?$/i.test(this.val());
        },
        /**
         *  ajax验证
         * */
        ajax:function(url, expected, type, param){
            var self = this,
                value = self.val(),
                name = self.attr('name');

            if (param) {
                if (typeof param === 'string') {
                    param += '&' + name + '=' + value;
                }
                else if (typeof param === 'object') {
                    param[name] = value;
                }
            }
            else {
                param = name + '=' + value;
            }
            return expected === $.ajax({
                url:url,
                type:(type ? type : 'GET'),
                data:param,
                async:false
            }).responseText;
        },
        /**
         *  特殊验证类型
         * */
        file:function(type, size){
            var result = false;
            if( type ){

            }
            else{
                console && console.log && console.log('参数设置错误');
            }
            return result;
        },
        url:function(reg){// 检验是否为合法 url，可以自定义验证正则表达式
            reg = reg || /^(?:http(?:s?):\/\/)?[a-z0-9\u4E00-\u9FA5\-_\.]*[a-z0-9\-_\u4E00-\u9FA5]+(?::(\d+))?\.[a-z0-9\u4E00-\u9FA5]+[0-9a-z\$\-\._'\(\)\/!\?#&\+=%\u4E00-\u9FA5]*/i;
            return reg.test(this.val());
        },
        email:function(reg){// 检验是否为合法邮箱，可以自定义验证正则表达式
            reg = reg || /^(?:[a-z0-9_\-\.'])+@(?:[a-z0-9_\-\.])+\.(?:[a-z]{2,6})$/i;
            return reg.test(this.val());
        },
        isChinese:function(){// 检测是否为中文，正则表达式为 /^[\u4E00-\u9FA5]*$/
            return /^[\u4E00-\u9FA5]*$/.test(this.val());
        },
        idNumber:function(reg){// 检测是否为合法身份证号码，可以自定义验证正则表达式
            reg = reg || /^\d{6}(?:((?:19|20)\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[1-2]\d|3[0-1])\d{3}(?:x|X|\d)|(?:\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[1-2]\d|3[0-1])\d{3}))$/;
            return reg.test(this.val());
        }
//        ,
//        tel:function () {
//
//        },
//        phone:function () {
//
//        }
    };
})(jQuery);