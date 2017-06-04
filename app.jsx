var React = require('react')
var ReactDom = require('react-dom')
var rcc = require('create-react-class')
var h = React.createElement
var pt = require('prop-types')
var curry = require('ramda/src/curry')
var compose = require('ramda/src/compose')
var xtend = require('xtend')

var requestTypes = {
    error: pt.func.isRequired,
    resolve: pt.func.isRequired,
    start: pt.func.isRequired
}

var api = {
    // echo
    fetch: function (data, cb) {
        setTimeout(function () {
            cb(null, data)
        }, 100)
    },

    error: function (err, cb) {
        setTimeout(function () {
            cb(err)
        }, 100)
    }
}

var Reduce = curry(function (fns, init, child) {
    return rcc({
        getInitialState: function () {
            return init
        },

        render: function () {
            var self = this
            var _fns = Object.keys(fns).reduce(function (acc, k) {
                acc[k] = function (ev) {
                    self.setState(fns[k](self.state, ev))
                }
                return acc
            }, {})

            var props = xtend(this.props, _fns, this.state)
            return h(child, props, [])
        }
    })
})


var FetchOnLoad = curry(function (fn, child) {
    var data
    return rcc({
        componentWillMount: function () {
            var self = this
            this.props.start({ op: 'fetch' })
            fn(function onResp (err, data) {
                self.props.resolve({ op: 'fetch' })
                if (err) self.props.error(err)
                else self.props.fetch(data)
            })
        },

        propTypes: function () {
            return xtend(requestTypes, {
                fetch: pt.func.isRequired
            })
        },

        render: function () {
            return h(child, this.props, [])
        }
    })
})

var Http = curry(function (api, child) {
    function http (props) {
        var _api = Object.keys(api).reduce(function (acc, k) {
            acc[k] = function (data) {
                props.start({ op: k, args: data})
                api[k](data, function onResponse (err, resp) {
                    props.resolve({ op: k, args: data })
                    if (err) props.error(err)
                    else props[k](resp)
                })
            }
            return acc
        }, {})

        return h(child, xtend(props, _api), [])
    }

    var fns = Object.keys(api).reduce(function (acc, k) {
        acc[k] = pt.func.isRequired
        return acc
    }, {})

    http.propTypes = xtend(fns, requestTypes)
    return http
})



// app code -------------------------

var reducer = Reduce({
    fetch: function (state, ev) {
        return xtend(state, { data: ev })
    },
    start: (state, ev) => {
        return xtend(state, {
            resolving: state.resolving.concat([ev])
        })
    },
    resolve: (state, ev) => xtend(state, {
        resolving: state.resolving.slice(1)
    }),
    error: (state, ev) => xtend(state, {
        errors: state.errors.concat([ev])
    })
}, {
    resolving: [],
    errors: [],
    data: {}
})

var route = compose(
    reducer,
    Http(api),
    FetchOnLoad(api.fetch.bind(api, { test: 'world' }))
)

function View (props) {
    console.log('props', props)
    return <div>
        hello {props.data.test}
    </div>
}

var root = document.createElement('div')
document.body.appendChild(root)
ReactDom.render(h(route(View), {}, []), root)

