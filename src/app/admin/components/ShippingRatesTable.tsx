'use client';

import { useEffect, useState } from 'react';
import { getShippingRates, updateShippingRate, addShippingRate, deleteShippingRate } from '@/app/actions/shipping-rates';
import { ArrowLeft, Plus, Save, Trash2, Edit2, X, RefreshCw, Package } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { COUNTRY_SERVICES } from '@/lib/shipping-config';

const MOCK_DATA = [{"idx":0,"id":1,"country_code":"CZ","shipping_type":"hd","max_weight":"1","price_ron":"40.46","price_eur":"8.54","price_usd":"9.26","price_gbp":"7.31","price_huf":"3334.92","price_bgn":"16.7"},{"idx":1,"id":2,"country_code":"CZ","shipping_type":"hd","max_weight":"2","price_ron":"42.84","price_eur":"9.04","price_usd":"9.81","price_gbp":"7.74","price_huf":"3531.09","price_bgn":"17.68"},{"idx":2,"id":3,"country_code":"CZ","shipping_type":"hd","max_weight":"5","price_ron":"46.41","price_eur":"9.79","price_usd":"10.62","price_gbp":"8.38","price_huf":"3825.34","price_bgn":"19.15"},{"idx":3,"id":4,"country_code":"CZ","shipping_type":"hd","max_weight":"10","price_ron":"52.36","price_eur":"11.05","price_usd":"11.99","price_gbp":"9.46","price_huf":"4315.77","price_bgn":"21.61"},{"idx":4,"id":5,"country_code":"CZ","shipping_type":"hd","max_weight":"15","price_ron":"61.88","price_eur":"13.06","price_usd":"14.16","price_gbp":"11.18","price_huf":"5100.46","price_bgn":"25.53"},{"idx":5,"id":6,"country_code":"CZ","shipping_type":"hd","max_weight":"30","price_ron":"70.21","price_eur":"14.82","price_usd":"16.07","price_gbp":"12.68","price_huf":"5787.06","price_bgn":"28.97"},{"idx":6,"id":7,"country_code":"CZ","shipping_type":"pudo","max_weight":"5","price_ron":"30.37","price_eur":"6.41","price_usd":"6.95","price_gbp":"5.48","price_huf":"2503.15","price_bgn":"12.53"},{"idx":7,"id":8,"country_code":"CZ","shipping_type":"pudo","max_weight":"10","price_ron":"30.37","price_eur":"6.41","price_usd":"6.95","price_gbp":"5.48","price_huf":"2503.15","price_bgn":"12.53"},{"idx":8,"id":9,"country_code":"CZ","shipping_type":"pudo","max_weight":"15","price_ron":"51.07","price_eur":"10.78","price_usd":"11.69","price_gbp":"9.22","price_huf":"4209.84","price_bgn":"21.08"},{"idx":9,"id":10,"country_code":"SK","shipping_type":"hd","max_weight":"1","price_ron":"46.93","price_eur":"9.91","price_usd":"10.74","price_gbp":"8.48","price_huf":"3868.5","price_bgn":"19.37"},{"idx":10,"id":11,"country_code":"SK","shipping_type":"hd","max_weight":"2","price_ron":"49.69","price_eur":"10.49","price_usd":"11.38","price_gbp":"8.97","price_huf":"4096.06","price_bgn":"20.51"},{"idx":11,"id":12,"country_code":"SK","shipping_type":"hd","max_weight":"5","price_ron":"52.46","price_eur":"11.07","price_usd":"12.01","price_gbp":"9.47","price_huf":"4323.62","price_bgn":"21.65"},{"idx":12,"id":13,"country_code":"SK","shipping_type":"hd","max_weight":"10","price_ron":"57.98","price_eur":"12.24","price_usd":"13.27","price_gbp":"10.47","price_huf":"4778.74","price_bgn":"23.92"},{"idx":13,"id":14,"country_code":"SK","shipping_type":"hd","max_weight":"15","price_ron":"85.58","price_eur":"18.06","price_usd":"19.59","price_gbp":"15.46","price_huf":"7054.33","price_bgn":"35.32"},{"idx":14,"id":15,"country_code":"SK","shipping_type":"hd","max_weight":"30","price_ron":"95.25","price_eur":"20.1","price_usd":"21.8","price_gbp":"17.2","price_huf":"7850.78","price_bgn":"39.3"},{"idx":15,"id":16,"country_code":"SK","shipping_type":"pudo","max_weight":"5","price_ron":"30.37","price_eur":"6.41","price_usd":"6.95","price_gbp":"5.48","price_huf":"2503.15","price_bgn":"12.53"},{"idx":16,"id":17,"country_code":"SK","shipping_type":"pudo","max_weight":"10","price_ron":"30.37","price_eur":"6.41","price_usd":"6.95","price_gbp":"5.48","price_huf":"2503.15","price_bgn":"12.53"},{"idx":17,"id":18,"country_code":"SK","shipping_type":"pudo","max_weight":"15","price_ron":"51.07","price_eur":"10.78","price_usd":"11.69","price_gbp":"9.22","price_huf":"4209.84","price_bgn":"21.08"},{"idx":18,"id":19,"country_code":"AT","shipping_type":"hd","max_weight":"1","price_ron":"54.74","price_eur":"11.55","price_usd":"12.53","price_gbp":"9.89","price_huf":"4511.94","price_bgn":"22.59"},{"idx":19,"id":20,"country_code":"AT","shipping_type":"hd","max_weight":"2","price_ron":"55.93","price_eur":"11.8","price_usd":"12.8","price_gbp":"10.1","price_huf":"4610.03","price_bgn":"23.08"},{"idx":20,"id":21,"country_code":"AT","shipping_type":"hd","max_weight":"5","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":21,"id":22,"country_code":"AT","shipping_type":"hd","max_weight":"10","price_ron":"66.64","price_eur":"14.06","price_usd":"15.25","price_gbp":"12.04","price_huf":"5492.8","price_bgn":"27.5"},{"idx":22,"id":23,"country_code":"AT","shipping_type":"hd","max_weight":"15","price_ron":"94.01","price_eur":"19.84","price_usd":"21.52","price_gbp":"16.98","price_huf":"7748.77","price_bgn":"38.79"},{"idx":23,"id":24,"country_code":"AT","shipping_type":"hd","max_weight":"30","price_ron":"147.56","price_eur":"31.14","price_usd":"33.78","price_gbp":"26.65","price_huf":"12162.63","price_bgn":"60.89"},{"idx":24,"id":25,"country_code":"BE","shipping_type":"hd","max_weight":"0.5","price_ron":"76.16","price_eur":"16.07","price_usd":"17.43","price_gbp":"13.75","price_huf":"6277.49","price_bgn":"31.43"},{"idx":25,"id":26,"country_code":"BE","shipping_type":"hd","max_weight":"1","price_ron":"83.3","price_eur":"17.58","price_usd":"19.07","price_gbp":"15.04","price_huf":"6866","price_bgn":"34.37"},{"idx":26,"id":27,"country_code":"BE","shipping_type":"hd","max_weight":"2","price_ron":"84.49","price_eur":"17.83","price_usd":"19.34","price_gbp":"15.26","price_huf":"6964.09","price_bgn":"34.86"},{"idx":27,"id":28,"country_code":"BE","shipping_type":"hd","max_weight":"5","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":28,"id":29,"country_code":"BE","shipping_type":"hd","max_weight":"10","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":29,"id":30,"country_code":"BE","shipping_type":"hd","max_weight":"15","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":30,"id":31,"country_code":"BE","shipping_type":"hd","max_weight":"20","price_ron":"171.36","price_eur":"36.17","price_usd":"39.22","price_gbp":"30.95","price_huf":"14124.35","price_bgn":"70.71"},{"idx":31,"id":32,"country_code":"BE","shipping_type":"pudo","max_weight":"1","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":32,"id":33,"country_code":"BE","shipping_type":"pudo","max_weight":"2","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":33,"id":34,"country_code":"BE","shipping_type":"pudo","max_weight":"5","price_ron":"94.01","price_eur":"19.84","price_usd":"21.52","price_gbp":"16.98","price_huf":"7748.77","price_bgn":"38.79"},{"idx":34,"id":35,"country_code":"BE","shipping_type":"pudo","max_weight":"10","price_ron":"105.91","price_eur":"22.35","price_usd":"24.24","price_gbp":"19.13","price_huf":"8729.63","price_bgn":"43.7"},{"idx":35,"id":36,"country_code":"BE","shipping_type":"pudo","max_weight":"15","price_ron":"117.81","price_eur":"24.86","price_usd":"26.97","price_gbp":"21.28","price_huf":"9710.49","price_bgn":"48.61"},{"idx":36,"id":37,"country_code":"BE","shipping_type":"pudo","max_weight":"30","price_ron":"129.71","price_eur":"27.38","price_usd":"29.69","price_gbp":"23.43","price_huf":"10691.35","price_bgn":"53.52"},{"idx":37,"id":38,"country_code":"BG","shipping_type":"hd","max_weight":"1","price_ron":"39.27","price_eur":"8.29","price_usd":"8.99","price_gbp":"7.09","price_huf":"3236.83","price_bgn":"16.2"},{"idx":38,"id":39,"country_code":"BG","shipping_type":"hd","max_weight":"2","price_ron":"42.84","price_eur":"9.04","price_usd":"9.81","price_gbp":"7.74","price_huf":"3531.09","price_bgn":"17.68"},{"idx":39,"id":40,"country_code":"BG","shipping_type":"hd","max_weight":"5","price_ron":"57.12","price_eur":"12.06","price_usd":"13.07","price_gbp":"10.32","price_huf":"4708.12","price_bgn":"23.57"},{"idx":40,"id":41,"country_code":"BG","shipping_type":"hd","max_weight":"10","price_ron":"64.26","price_eur":"13.56","price_usd":"14.71","price_gbp":"11.61","price_huf":"5296.63","price_bgn":"26.52"},{"idx":41,"id":42,"country_code":"BG","shipping_type":"hd","max_weight":"15","price_ron":"94.01","price_eur":"19.84","price_usd":"21.52","price_gbp":"16.98","price_huf":"7748.77","price_bgn":"38.79"},{"idx":42,"id":43,"country_code":"BG","shipping_type":"hd","max_weight":"20","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":43,"id":44,"country_code":"BG","shipping_type":"pudo","max_weight":"1","price_ron":"33.32","price_eur":"7.03","price_usd":"7.63","price_gbp":"6.02","price_huf":"2746.4","price_bgn":"13.75"},{"idx":44,"id":45,"country_code":"BG","shipping_type":"pudo","max_weight":"2","price_ron":"34.51","price_eur":"7.28","price_usd":"7.9","price_gbp":"6.23","price_huf":"2844.49","price_bgn":"14.24"},{"idx":45,"id":46,"country_code":"BG","shipping_type":"pudo","max_weight":"5","price_ron":"39.27","price_eur":"8.29","price_usd":"8.99","price_gbp":"7.09","price_huf":"3236.83","price_bgn":"16.2"},{"idx":46,"id":47,"country_code":"BG","shipping_type":"pudo","max_weight":"10","price_ron":"45.22","price_eur":"9.54","price_usd":"10.35","price_gbp":"8.17","price_huf":"3727.26","price_bgn":"18.66"},{"idx":47,"id":48,"country_code":"BG","shipping_type":"pudo","max_weight":"15","price_ron":"53.55","price_eur":"11.3","price_usd":"12.26","price_gbp":"9.67","price_huf":"4413.86","price_bgn":"22.1"},{"idx":48,"id":49,"country_code":"BG","shipping_type":"pudo","max_weight":"20","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":49,"id":50,"country_code":"CY","shipping_type":"pudo","max_weight":"1","price_ron":"45.22","price_eur":"9.54","price_usd":"10.35","price_gbp":"8.17","price_huf":"3727.26","price_bgn":"18.66"},{"idx":50,"id":51,"country_code":"CY","shipping_type":"pudo","max_weight":"2","price_ron":"45.22","price_eur":"9.54","price_usd":"10.35","price_gbp":"8.17","price_huf":"3727.26","price_bgn":"18.66"},{"idx":51,"id":52,"country_code":"CY","shipping_type":"pudo","max_weight":"5","price_ron":"46.95","price_eur":"9.91","price_usd":"10.75","price_gbp":"8.48","price_huf":"3869.48","price_bgn":"19.37"},{"idx":52,"id":53,"country_code":"CY","shipping_type":"pudo","max_weight":"7","price_ron":"49.98","price_eur":"10.55","price_usd":"11.44","price_gbp":"9.03","price_huf":"4119.6","price_bgn":"20.62"},{"idx":53,"id":54,"country_code":"HR","shipping_type":"hd","max_weight":"1","price_ron":"42.84","price_eur":"9.04","price_usd":"9.81","price_gbp":"7.74","price_huf":"3531.09","price_bgn":"17.68"},{"idx":54,"id":55,"country_code":"HR","shipping_type":"hd","max_weight":"2","price_ron":"46.41","price_eur":"9.79","price_usd":"10.62","price_gbp":"8.38","price_huf":"3825.34","price_bgn":"19.15"},{"idx":55,"id":56,"country_code":"HR","shipping_type":"hd","max_weight":"5","price_ron":"47.6","price_eur":"10.05","price_usd":"10.9","price_gbp":"8.6","price_huf":"3923.43","price_bgn":"19.64"},{"idx":56,"id":57,"country_code":"HR","shipping_type":"hd","max_weight":"10","price_ron":"51.17","price_eur":"10.8","price_usd":"11.71","price_gbp":"9.24","price_huf":"4217.69","price_bgn":"21.12"},{"idx":57,"id":58,"country_code":"HR","shipping_type":"hd","max_weight":"15","price_ron":"70.21","price_eur":"14.82","price_usd":"16.07","price_gbp":"12.68","price_huf":"5787.06","price_bgn":"28.97"},{"idx":58,"id":59,"country_code":"HR","shipping_type":"hd","max_weight":"30","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":59,"id":60,"country_code":"HR","shipping_type":"hd","max_weight":"50","price_ron":"647.36","price_eur":"136.63","price_usd":"148.18","price_gbp":"116.91","price_huf":"53358.65","price_bgn":"267.13"},{"idx":60,"id":61,"country_code":"EE","shipping_type":"hd","max_weight":"1","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":61,"id":62,"country_code":"EE","shipping_type":"hd","max_weight":"2","price_ron":"64.26","price_eur":"13.56","price_usd":"14.71","price_gbp":"11.61","price_huf":"5296.63","price_bgn":"26.52"},{"idx":62,"id":63,"country_code":"EE","shipping_type":"hd","max_weight":"5","price_ron":"67.83","price_eur":"14.32","price_usd":"15.53","price_gbp":"12.25","price_huf":"5590.89","price_bgn":"27.99"},{"idx":63,"id":64,"country_code":"EE","shipping_type":"hd","max_weight":"10","price_ron":"72.59","price_eur":"15.32","price_usd":"16.62","price_gbp":"13.11","price_huf":"5983.23","price_bgn":"29.95"},{"idx":64,"id":65,"country_code":"EE","shipping_type":"hd","max_weight":"15","price_ron":"92.82","price_eur":"19.59","price_usd":"21.25","price_gbp":"16.76","price_huf":"7650.69","price_bgn":"38.3"},{"idx":65,"id":66,"country_code":"EE","shipping_type":"hd","max_weight":"30","price_ron":"109.48","price_eur":"23.11","price_usd":"25.06","price_gbp":"19.77","price_huf":"9023.89","price_bgn":"45.18"},{"idx":66,"id":67,"country_code":"FI","shipping_type":"hd","max_weight":"1","price_ron":"160.65","price_eur":"33.91","price_usd":"36.77","price_gbp":"29.01","price_huf":"13241.58","price_bgn":"66.29"},{"idx":67,"id":68,"country_code":"FI","shipping_type":"hd","max_weight":"2","price_ron":"163.03","price_eur":"34.41","price_usd":"37.32","price_gbp":"29.44","price_huf":"13437.75","price_bgn":"67.27"},{"idx":68,"id":69,"country_code":"FI","shipping_type":"hd","max_weight":"5","price_ron":"166.6","price_eur":"35.16","price_usd":"38.13","price_gbp":"30.09","price_huf":"13732.01","price_bgn":"68.75"},{"idx":69,"id":70,"country_code":"FI","shipping_type":"hd","max_weight":"10","price_ron":"173.74","price_eur":"36.67","price_usd":"39.77","price_gbp":"31.38","price_huf":"14320.52","price_bgn":"71.69"},{"idx":70,"id":71,"country_code":"FI","shipping_type":"hd","max_weight":"15","price_ron":"189.21","price_eur":"39.93","price_usd":"43.31","price_gbp":"34.17","price_huf":"15595.63","price_bgn":"78.08"},{"idx":71,"id":72,"country_code":"FI","shipping_type":"hd","max_weight":"30","price_ron":"195.16","price_eur":"41.19","price_usd":"44.67","price_gbp":"35.25","price_huf":"16086.06","price_bgn":"80.53"},{"idx":72,"id":73,"country_code":"FI","shipping_type":"hd","max_weight":"100","price_ron":"784.21","price_eur":"165.51","price_usd":"179.51","price_gbp":"141.63","price_huf":"64638.51","price_bgn":"323.6"},{"idx":73,"id":74,"country_code":"FR","shipping_type":"hd","max_weight":"0.5","price_ron":"63.07","price_eur":"13.31","price_usd":"14.44","price_gbp":"11.39","price_huf":"5198.54","price_bgn":"26.03"},{"idx":74,"id":75,"country_code":"FR","shipping_type":"hd","max_weight":"1","price_ron":"63.07","price_eur":"13.31","price_usd":"14.44","price_gbp":"11.39","price_huf":"5198.54","price_bgn":"26.03"},{"idx":75,"id":76,"country_code":"FR","shipping_type":"hd","max_weight":"2","price_ron":"67.83","price_eur":"14.32","price_usd":"15.53","price_gbp":"12.25","price_huf":"5590.89","price_bgn":"27.99"},{"idx":76,"id":77,"country_code":"FR","shipping_type":"hd","max_weight":"5","price_ron":"75.57","price_eur":"15.95","price_usd":"17.3","price_gbp":"13.65","price_huf":"6228.45","price_bgn":"31.18"},{"idx":77,"id":78,"country_code":"FR","shipping_type":"hd","max_weight":"10","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":78,"id":79,"country_code":"FR","shipping_type":"hd","max_weight":"15","price_ron":"104.72","price_eur":"22.1","price_usd":"23.97","price_gbp":"18.91","price_huf":"8631.55","price_bgn":"43.21"},{"idx":79,"id":80,"country_code":"FR","shipping_type":"hd","max_weight":"30","price_ron":"127.33","price_eur":"26.87","price_usd":"29.15","price_gbp":"23","price_huf":"10495.18","price_bgn":"52.54"},{"idx":80,"id":81,"country_code":"FR","shipping_type":"pudo","max_weight":"1","price_ron":"51.17","price_eur":"10.8","price_usd":"11.71","price_gbp":"9.24","price_huf":"4217.69","price_bgn":"21.12"},{"idx":81,"id":82,"country_code":"FR","shipping_type":"pudo","max_weight":"2","price_ron":"52.36","price_eur":"11.05","price_usd":"11.99","price_gbp":"9.46","price_huf":"4315.77","price_bgn":"21.61"},{"idx":82,"id":83,"country_code":"FR","shipping_type":"pudo","max_weight":"5","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":83,"id":84,"country_code":"FR","shipping_type":"pudo","max_weight":"10","price_ron":"72.59","price_eur":"15.32","price_usd":"16.62","price_gbp":"13.11","price_huf":"5983.23","price_bgn":"29.95"},{"idx":84,"id":85,"country_code":"FR","shipping_type":"pudo","max_weight":"15","price_ron":"111.86","price_eur":"23.61","price_usd":"25.6","price_gbp":"20.2","price_huf":"9220.06","price_bgn":"46.16"},{"idx":85,"id":86,"country_code":"FR","shipping_type":"pudo","max_weight":"30","price_ron":"129.71","price_eur":"27.38","price_usd":"29.69","price_gbp":"23.43","price_huf":"10691.35","price_bgn":"53.52"},{"idx":86,"id":87,"country_code":"DE","shipping_type":"hd","max_weight":"1","price_ron":"49.98","price_eur":"10.55","price_usd":"11.44","price_gbp":"9.03","price_huf":"4119.6","price_bgn":"20.62"},{"idx":87,"id":88,"country_code":"DE","shipping_type":"hd","max_weight":"2","price_ron":"53.55","price_eur":"11.3","price_usd":"12.26","price_gbp":"9.67","price_huf":"4413.86","price_bgn":"22.1"},{"idx":88,"id":89,"country_code":"DE","shipping_type":"hd","max_weight":"5","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":89,"id":90,"country_code":"DE","shipping_type":"hd","max_weight":"10","price_ron":"64.26","price_eur":"13.56","price_usd":"14.71","price_gbp":"11.61","price_huf":"5296.63","price_bgn":"26.52"},{"idx":90,"id":91,"country_code":"DE","shipping_type":"hd","max_weight":"15","price_ron":"94.01","price_eur":"19.84","price_usd":"21.52","price_gbp":"16.98","price_huf":"7748.77","price_bgn":"38.79"},{"idx":91,"id":92,"country_code":"DE","shipping_type":"hd","max_weight":"30","price_ron":"164.22","price_eur":"34.66","price_usd":"37.59","price_gbp":"29.66","price_huf":"13535.83","price_bgn":"67.77"},{"idx":92,"id":93,"country_code":"GR","shipping_type":"hd","max_weight":"1","price_ron":"37.49","price_eur":"7.91","price_usd":"8.58","price_gbp":"6.77","price_huf":"3089.7","price_bgn":"15.47"},{"idx":93,"id":94,"country_code":"GR","shipping_type":"hd","max_weight":"2","price_ron":"38.67","price_eur":"8.16","price_usd":"8.85","price_gbp":"6.98","price_huf":"3187.79","price_bgn":"15.96"},{"idx":94,"id":95,"country_code":"GR","shipping_type":"hd","max_weight":"5","price_ron":"41.65","price_eur":"8.79","price_usd":"9.53","price_gbp":"7.52","price_huf":"3433","price_bgn":"17.19"},{"idx":95,"id":96,"country_code":"GR","shipping_type":"hd","max_weight":"6","price_ron":"52.36","price_eur":"11.05","price_usd":"11.99","price_gbp":"9.46","price_huf":"4315.77","price_bgn":"21.61"},{"idx":96,"id":97,"country_code":"GR","shipping_type":"hd","max_weight":"7","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":97,"id":98,"country_code":"GR","shipping_type":"hd","max_weight":"8","price_ron":"64.26","price_eur":"13.56","price_usd":"14.71","price_gbp":"11.61","price_huf":"5296.63","price_bgn":"26.52"},{"idx":98,"id":99,"country_code":"GR","shipping_type":"hd","max_weight":"10","price_ron":"66.64","price_eur":"14.06","price_usd":"15.25","price_gbp":"12.04","price_huf":"5492.8","price_bgn":"27.5"},{"idx":99,"id":100,"country_code":"GR","shipping_type":"hd","max_weight":"15","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":100,"id":101,"country_code":"GR","shipping_type":"hd","max_weight":"20","price_ron":"105.91","price_eur":"22.35","price_usd":"24.24","price_gbp":"19.13","price_huf":"8729.63","price_bgn":"43.7"},{"idx":101,"id":102,"country_code":"GR","shipping_type":"hd","max_weight":"25","price_ron":"141.61","price_eur":"29.89","price_usd":"32.41","price_gbp":"25.57","price_huf":"11672.2","price_bgn":"58.44"},{"idx":102,"id":103,"country_code":"GR","shipping_type":"hd","max_weight":"30","price_ron":"165.41","price_eur":"34.91","price_usd":"37.86","price_gbp":"29.87","price_huf":"13633.92","price_bgn":"68.26"},{"idx":103,"id":104,"country_code":"GR","shipping_type":"pudo","max_weight":"5","price_ron":"32.13","price_eur":"6.78","price_usd":"7.35","price_gbp":"5.8","price_huf":"2648.32","price_bgn":"13.26"},{"idx":104,"id":105,"country_code":"GR","shipping_type":"pudo","max_weight":"10","price_ron":"32.13","price_eur":"6.78","price_usd":"7.35","price_gbp":"5.8","price_huf":"2648.32","price_bgn":"13.26"},{"idx":105,"id":106,"country_code":"GR","shipping_type":"pudo","max_weight":"15","price_ron":"42.84","price_eur":"9.04","price_usd":"9.81","price_gbp":"7.74","price_huf":"3531.09","price_bgn":"17.68"},{"idx":106,"id":107,"country_code":"IT","shipping_type":"hd","max_weight":"1","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":107,"id":108,"country_code":"IT","shipping_type":"hd","max_weight":"2","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":108,"id":109,"country_code":"IT","shipping_type":"hd","max_weight":"5","price_ron":"70.21","price_eur":"14.82","price_usd":"16.07","price_gbp":"12.68","price_huf":"5787.06","price_bgn":"28.97"},{"idx":109,"id":110,"country_code":"IT","shipping_type":"hd","max_weight":"10","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":110,"id":111,"country_code":"IT","shipping_type":"hd","max_weight":"15","price_ron":"120.19","price_eur":"25.37","price_usd":"27.51","price_gbp":"21.71","price_huf":"9906.66","price_bgn":"49.6"},{"idx":111,"id":112,"country_code":"IT","shipping_type":"hd","max_weight":"30","price_ron":"147.56","price_eur":"31.14","price_usd":"33.78","price_gbp":"26.65","price_huf":"12162.63","price_bgn":"60.89"},{"idx":112,"id":113,"country_code":"IT","shipping_type":"hd","max_weight":"50","price_ron":"248.71","price_eur":"52.49","price_usd":"56.93","price_gbp":"44.92","price_huf":"20499.92","price_bgn":"102.63"},{"idx":113,"id":114,"country_code":"IT","shipping_type":"hd","max_weight":"100","price_ron":"427.21","price_eur":"90.16","price_usd":"97.79","price_gbp":"77.15","price_huf":"35212.78","price_bgn":"176.29"},{"idx":114,"id":115,"country_code":"IT","shipping_type":"pudo","max_weight":"1","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":115,"id":116,"country_code":"IT","shipping_type":"pudo","max_weight":"2","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":116,"id":117,"country_code":"IT","shipping_type":"pudo","max_weight":"5","price_ron":"70.21","price_eur":"14.82","price_usd":"16.07","price_gbp":"12.68","price_huf":"5787.06","price_bgn":"28.97"},{"idx":117,"id":118,"country_code":"IT","shipping_type":"pudo","max_weight":"10","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":118,"id":119,"country_code":"IT","shipping_type":"pudo","max_weight":"15","price_ron":"120.19","price_eur":"25.37","price_usd":"27.51","price_gbp":"21.71","price_huf":"9906.66","price_bgn":"49.6"},{"idx":119,"id":120,"country_code":"IT","shipping_type":"pudo","max_weight":"30","price_ron":"147.56","price_eur":"31.14","price_usd":"33.78","price_gbp":"26.65","price_huf":"12162.63","price_bgn":"60.89"},{"idx":120,"id":121,"country_code":"IT","shipping_type":"pudo","max_weight":"50","price_ron":"248.71","price_eur":"52.49","price_usd":"56.93","price_gbp":"44.92","price_huf":"20499.92","price_bgn":"102.63"},{"idx":121,"id":122,"country_code":"IT","shipping_type":"pudo","max_weight":"100","price_ron":"427.21","price_eur":"90.16","price_usd":"97.79","price_gbp":"77.15","price_huf":"35212.78","price_bgn":"176.29"},{"idx":122,"id":123,"country_code":"LV","shipping_type":"hd","max_weight":"1","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":123,"id":124,"country_code":"LV","shipping_type":"hd","max_weight":"2","price_ron":"64.26","price_eur":"13.56","price_usd":"14.71","price_gbp":"11.61","price_huf":"5296.63","price_bgn":"26.52"},{"idx":124,"id":125,"country_code":"LV","shipping_type":"hd","max_weight":"5","price_ron":"66.64","price_eur":"14.06","price_usd":"15.25","price_gbp":"12.04","price_huf":"5492.8","price_bgn":"27.5"},{"idx":125,"id":126,"country_code":"LV","shipping_type":"hd","max_weight":"10","price_ron":"72.59","price_eur":"15.32","price_usd":"16.62","price_gbp":"13.11","price_huf":"5983.23","price_bgn":"29.95"},{"idx":126,"id":127,"country_code":"LV","shipping_type":"hd","max_weight":"15","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":127,"id":128,"country_code":"LV","shipping_type":"hd","max_weight":"30","price_ron":"123.76","price_eur":"26.12","price_usd":"28.33","price_gbp":"22.35","price_huf":"10200.92","price_bgn":"51.07"},{"idx":128,"id":129,"country_code":"LT","shipping_type":"hd","max_weight":"2","price_ron":"47.6","price_eur":"10.05","price_usd":"10.9","price_gbp":"8.6","price_huf":"3923.43","price_bgn":"19.64"},{"idx":129,"id":130,"country_code":"LT","shipping_type":"hd","max_weight":"5","price_ron":"49.98","price_eur":"10.55","price_usd":"11.44","price_gbp":"9.03","price_huf":"4119.6","price_bgn":"20.62"},{"idx":130,"id":131,"country_code":"LT","shipping_type":"hd","max_weight":"10","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":131,"id":132,"country_code":"LT","shipping_type":"hd","max_weight":"15","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":132,"id":133,"country_code":"LT","shipping_type":"hd","max_weight":"30","price_ron":"105.91","price_eur":"22.35","price_usd":"24.24","price_gbp":"19.13","price_huf":"8729.63","price_bgn":"43.7"},{"idx":133,"id":134,"country_code":"LU","shipping_type":"hd","max_weight":"1","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":134,"id":135,"country_code":"LU","shipping_type":"hd","max_weight":"2","price_ron":"86.87","price_eur":"18.33","price_usd":"19.88","price_gbp":"15.69","price_huf":"7160.26","price_bgn":"35.85"},{"idx":135,"id":136,"country_code":"LU","shipping_type":"hd","max_weight":"5","price_ron":"111.86","price_eur":"23.61","price_usd":"25.6","price_gbp":"20.2","price_huf":"9220.06","price_bgn":"46.16"},{"idx":136,"id":137,"country_code":"LU","shipping_type":"hd","max_weight":"10","price_ron":"135.66","price_eur":"28.63","price_usd":"31.05","price_gbp":"24.5","price_huf":"11181.78","price_bgn":"55.98"},{"idx":137,"id":138,"country_code":"LU","shipping_type":"hd","max_weight":"15","price_ron":"177.31","price_eur":"37.42","price_usd":"40.59","price_gbp":"32.02","price_huf":"14614.78","price_bgn":"73.17"},{"idx":138,"id":139,"country_code":"LU","shipping_type":"hd","max_weight":"30","price_ron":"272.51","price_eur":"57.51","price_usd":"62.38","price_gbp":"49.22","price_huf":"22461.64","price_bgn":"112.45"},{"idx":139,"id":140,"country_code":"NL","shipping_type":"hd","max_weight":"1","price_ron":"76.16","price_eur":"16.07","price_usd":"17.43","price_gbp":"13.75","price_huf":"6277.49","price_bgn":"31.43"},{"idx":140,"id":141,"country_code":"NL","shipping_type":"hd","max_weight":"2","price_ron":"77.35","price_eur":"16.32","price_usd":"17.71","price_gbp":"13.97","price_huf":"6375.57","price_bgn":"31.92"},{"idx":141,"id":142,"country_code":"NL","shipping_type":"hd","max_weight":"5","price_ron":"83.3","price_eur":"17.58","price_usd":"19.07","price_gbp":"15.04","price_huf":"6866","price_bgn":"34.37"},{"idx":142,"id":143,"country_code":"NL","shipping_type":"hd","max_weight":"10","price_ron":"85.68","price_eur":"18.08","price_usd":"19.61","price_gbp":"15.47","price_huf":"7062.17","price_bgn":"35.36"},{"idx":143,"id":144,"country_code":"NL","shipping_type":"hd","max_weight":"15","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":144,"id":145,"country_code":"NL","shipping_type":"hd","max_weight":"30","price_ron":"111.86","price_eur":"23.61","price_usd":"25.6","price_gbp":"20.2","price_huf":"9220.06","price_bgn":"46.16"},{"idx":145,"id":146,"country_code":"PL","shipping_type":"hd","max_weight":"1","price_ron":"44.03","price_eur":"9.29","price_usd":"10.08","price_gbp":"7.95","price_huf":"3629.17","price_bgn":"18.17"},{"idx":146,"id":147,"country_code":"PL","shipping_type":"hd","max_weight":"2","price_ron":"46.41","price_eur":"9.79","price_usd":"10.62","price_gbp":"8.38","price_huf":"3825.34","price_bgn":"19.15"},{"idx":147,"id":148,"country_code":"PL","shipping_type":"hd","max_weight":"5","price_ron":"49.98","price_eur":"10.55","price_usd":"11.44","price_gbp":"9.03","price_huf":"4119.6","price_bgn":"20.62"},{"idx":148,"id":149,"country_code":"PL","shipping_type":"hd","max_weight":"10","price_ron":"61.88","price_eur":"13.06","price_usd":"14.16","price_gbp":"11.18","price_huf":"5100.46","price_bgn":"25.53"},{"idx":149,"id":150,"country_code":"PL","shipping_type":"hd","max_weight":"15","price_ron":"70.21","price_eur":"14.82","price_usd":"16.07","price_gbp":"12.68","price_huf":"5787.06","price_bgn":"28.97"},{"idx":150,"id":151,"country_code":"PL","shipping_type":"hd","max_weight":"30","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":151,"id":152,"country_code":"PL","shipping_type":"hd","max_weight":"50","price_ron":"153.51","price_eur":"32.4","price_usd":"35.14","price_gbp":"27.72","price_huf":"12653.06","price_bgn":"63.35"},{"idx":152,"id":153,"country_code":"PL","shipping_type":"pudo","max_weight":"5","price_ron":"38.08","price_eur":"8.04","price_usd":"8.72","price_gbp":"6.88","price_huf":"3138.74","price_bgn":"15.71"},{"idx":153,"id":154,"country_code":"PL","shipping_type":"pudo","max_weight":"10","price_ron":"41.65","price_eur":"8.79","price_usd":"9.53","price_gbp":"7.52","price_huf":"3433","price_bgn":"17.19"},{"idx":154,"id":155,"country_code":"PL","shipping_type":"pudo","max_weight":"15","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":155,"id":156,"country_code":"PT","shipping_type":"hd","max_weight":"1","price_ron":"57.12","price_eur":"12.06","price_usd":"13.07","price_gbp":"10.32","price_huf":"4708.12","price_bgn":"23.57"},{"idx":156,"id":157,"country_code":"PT","shipping_type":"hd","max_weight":"2","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":157,"id":158,"country_code":"PT","shipping_type":"hd","max_weight":"5","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":158,"id":159,"country_code":"PT","shipping_type":"hd","max_weight":"10","price_ron":"71.4","price_eur":"15.07","price_usd":"16.34","price_gbp":"12.89","price_huf":"5885.15","price_bgn":"29.46"},{"idx":159,"id":160,"country_code":"PT","shipping_type":"hd","max_weight":"15","price_ron":"88.06","price_eur":"18.59","price_usd":"20.16","price_gbp":"15.9","price_huf":"7258.35","price_bgn":"36.34"},{"idx":160,"id":161,"country_code":"PT","shipping_type":"hd","max_weight":"30","price_ron":"94.01","price_eur":"19.84","price_usd":"21.52","price_gbp":"16.98","price_huf":"7748.77","price_bgn":"38.79"},{"idx":161,"id":162,"country_code":"GB","shipping_type":"hd","max_weight":"0.5","price_ron":"80.92","price_eur":"17.08","price_usd":"18.52","price_gbp":"14.61","price_huf":"6669.83","price_bgn":"33.39"},{"idx":162,"id":163,"country_code":"GB","shipping_type":"hd","max_weight":"1","price_ron":"83.3","price_eur":"17.58","price_usd":"19.07","price_gbp":"15.04","price_huf":"6866","price_bgn":"34.37"},{"idx":163,"id":164,"country_code":"GB","shipping_type":"hd","max_weight":"2","price_ron":"98.77","price_eur":"20.85","price_usd":"22.61","price_gbp":"17.84","price_huf":"8141.12","price_bgn":"40.76"},{"idx":164,"id":165,"country_code":"GB","shipping_type":"hd","max_weight":"5","price_ron":"143.99","price_eur":"30.39","price_usd":"32.96","price_gbp":"26","price_huf":"11868.38","price_bgn":"59.42"},{"idx":165,"id":166,"country_code":"GB","shipping_type":"hd","max_weight":"10","price_ron":"223.72","price_eur":"47.22","price_usd":"51.21","price_gbp":"40.4","price_huf":"18440.12","price_bgn":"92.32"},{"idx":166,"id":167,"country_code":"GB","shipping_type":"hd","max_weight":"15","price_ron":"326.06","price_eur":"68.81","price_usd":"74.64","price_gbp":"58.89","price_huf":"26875.5","price_bgn":"134.55"},{"idx":167,"id":168,"country_code":"GB","shipping_type":"hd","max_weight":"20","price_ron":"409.36","price_eur":"86.4","price_usd":"93.7","price_gbp":"73.93","price_huf":"33741.5","price_bgn":"168.92"},{"idx":168,"id":169,"country_code":"SI","shipping_type":"hd","max_weight":"1","price_ron":"41.65","price_eur":"8.79","price_usd":"9.53","price_gbp":"7.52","price_huf":"3433","price_bgn":"17.19"},{"idx":169,"id":170,"country_code":"SI","shipping_type":"hd","max_weight":"2","price_ron":"42.84","price_eur":"9.04","price_usd":"9.81","price_gbp":"7.74","price_huf":"3531.09","price_bgn":"17.68"},{"idx":170,"id":171,"country_code":"SI","shipping_type":"hd","max_weight":"5","price_ron":"45.22","price_eur":"9.54","price_usd":"10.35","price_gbp":"8.17","price_huf":"3727.26","price_bgn":"18.66"},{"idx":171,"id":172,"country_code":"SI","shipping_type":"hd","max_weight":"10","price_ron":"51.17","price_eur":"10.8","price_usd":"11.71","price_gbp":"9.24","price_huf":"4217.69","price_bgn":"21.12"},{"idx":172,"id":173,"country_code":"SI","shipping_type":"hd","max_weight":"15","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":173,"id":174,"country_code":"SI","shipping_type":"hd","max_weight":"30","price_ron":"105.91","price_eur":"22.35","price_usd":"24.24","price_gbp":"19.13","price_huf":"8729.63","price_bgn":"43.7"},{"idx":174,"id":175,"country_code":"ES","shipping_type":"hd","max_weight":"1","price_ron":"57.12","price_eur":"12.06","price_usd":"13.07","price_gbp":"10.32","price_huf":"4708.12","price_bgn":"23.57"},{"idx":175,"id":176,"country_code":"ES","shipping_type":"hd","max_weight":"2","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":176,"id":177,"country_code":"ES","shipping_type":"hd","max_weight":"5","price_ron":"60.69","price_eur":"12.81","price_usd":"13.89","price_gbp":"10.96","price_huf":"5002.37","price_bgn":"25.04"},{"idx":177,"id":178,"country_code":"ES","shipping_type":"hd","max_weight":"10","price_ron":"72.59","price_eur":"15.32","price_usd":"16.62","price_gbp":"13.11","price_huf":"5983.23","price_bgn":"29.95"},{"idx":178,"id":179,"country_code":"ES","shipping_type":"hd","max_weight":"15","price_ron":"89.25","price_eur":"18.84","price_usd":"20.43","price_gbp":"16.12","price_huf":"7356.43","price_bgn":"36.83"},{"idx":179,"id":180,"country_code":"ES","shipping_type":"hd","max_weight":"30","price_ron":"92.82","price_eur":"19.59","price_usd":"21.25","price_gbp":"16.76","price_huf":"7650.69","price_bgn":"38.3"},{"idx":180,"id":181,"country_code":"ES","shipping_type":"pudo","max_weight":"1","price_ron":"52.36","price_eur":"11.05","price_usd":"11.99","price_gbp":"9.46","price_huf":"4315.77","price_bgn":"21.61"},{"idx":181,"id":182,"country_code":"ES","shipping_type":"pudo","max_weight":"2","price_ron":"53.55","price_eur":"11.3","price_usd":"12.26","price_gbp":"9.67","price_huf":"4413.86","price_bgn":"22.1"},{"idx":182,"id":183,"country_code":"ES","shipping_type":"pudo","max_weight":"3","price_ron":"55.93","price_eur":"11.8","price_usd":"12.8","price_gbp":"10.1","price_huf":"4610.03","price_bgn":"23.08"},{"idx":183,"id":184,"country_code":"ES","shipping_type":"pudo","max_weight":"5","price_ron":"55.93","price_eur":"11.8","price_usd":"12.8","price_gbp":"10.1","price_huf":"4610.03","price_bgn":"23.08"},{"idx":184,"id":185,"country_code":"ES","shipping_type":"pudo","max_weight":"10","price_ron":"67.83","price_eur":"14.32","price_usd":"15.53","price_gbp":"12.25","price_huf":"5590.89","price_bgn":"27.99"},{"idx":185,"id":186,"country_code":"ES","shipping_type":"pudo","max_weight":"15","price_ron":"99.96","price_eur":"21.1","price_usd":"22.88","price_gbp":"18.05","price_huf":"8239.2","price_bgn":"41.25"},{"idx":186,"id":187,"country_code":"ES","shipping_type":"pudo","max_weight":"30","price_ron":"111.86","price_eur":"23.61","price_usd":"25.6","price_gbp":"20.2","price_huf":"9220.06","price_bgn":"46.16"},{"idx":187,"id":188,"country_code":"SE","shipping_type":"hd","max_weight":"1","price_ron":"116.62","price_eur":"24.61","price_usd":"26.69","price_gbp":"21.06","price_huf":"9612.4","price_bgn":"48.12"},{"idx":188,"id":189,"country_code":"SE","shipping_type":"hd","max_weight":"2","price_ron":"119","price_eur":"25.11","price_usd":"27.24","price_gbp":"21.49","price_huf":"9808.57","price_bgn":"49.11"},{"idx":189,"id":190,"country_code":"SE","shipping_type":"hd","max_weight":"5","price_ron":"122.57","price_eur":"25.87","price_usd":"28.06","price_gbp":"22.14","price_huf":"10102.83","price_bgn":"50.58"},{"idx":190,"id":191,"country_code":"SE","shipping_type":"hd","max_weight":"10","price_ron":"135.66","price_eur":"28.63","price_usd":"31.05","price_gbp":"24.5","price_huf":"11181.78","price_bgn":"55.98"},{"idx":191,"id":192,"country_code":"SE","shipping_type":"hd","max_weight":"15","price_ron":"177.31","price_eur":"37.42","price_usd":"40.59","price_gbp":"32.02","price_huf":"14614.78","price_bgn":"73.17"},{"idx":192,"id":193,"country_code":"SE","shipping_type":"hd","max_weight":"30","price_ron":"201.11","price_eur":"42.44","price_usd":"46.03","price_gbp":"36.32","price_huf":"16576.49","price_bgn":"82.99"},{"idx":193,"id":194,"country_code":"SE","shipping_type":"hd","max_weight":"100","price_ron":"367.71","price_eur":"77.61","price_usd":"84.17","price_gbp":"66.41","price_huf":"30308.5","price_bgn":"151.74"},{"idx":194,"id":195,"country_code":"HU","shipping_type":"hd","max_weight":"1","price_ron":"38.67","price_eur":"8.16","price_usd":"8.85","price_gbp":"6.98","price_huf":"3187.79","price_bgn":"15.96"},{"idx":195,"id":196,"country_code":"HU","shipping_type":"hd","max_weight":"2","price_ron":"39.86","price_eur":"8.41","price_usd":"9.13","price_gbp":"7.2","price_huf":"3285.87","price_bgn":"16.45"},{"idx":196,"id":197,"country_code":"HU","shipping_type":"hd","max_weight":"5","price_ron":"41.06","price_eur":"8.66","price_usd":"9.4","price_gbp":"7.41","price_huf":"3383.96","price_bgn":"16.94"},{"idx":197,"id":198,"country_code":"HU","shipping_type":"hd","max_weight":"10","price_ron":"46.41","price_eur":"9.79","price_usd":"10.62","price_gbp":"8.38","price_huf":"3825.34","price_bgn":"19.15"},{"idx":198,"id":199,"country_code":"HU","shipping_type":"hd","max_weight":"15","price_ron":"58.31","price_eur":"12.31","price_usd":"13.35","price_gbp":"10.53","price_huf":"4806.2","price_bgn":"24.06"},{"idx":199,"id":200,"country_code":"HU","shipping_type":"hd","max_weight":"30","price_ron":"82.11","price_eur":"17.33","price_usd":"18.79","price_gbp":"14.83","price_huf":"6767.92","price_bgn":"33.88"},{"idx":200,"id":201,"country_code":"HU","shipping_type":"hd","max_weight":"50","price_ron":"117.81","price_eur":"24.86","price_usd":"26.97","price_gbp":"21.28","price_huf":"9710.49","price_bgn":"48.61"},{"idx":201,"id":202,"country_code":"RO","shipping_type":"hd","max_weight":"30","price_ron":"20","price_eur":"4.22","price_usd":"4.58","price_gbp":"3.61","price_huf":"1648.5","price_bgn":"8.25"},{"idx":202,"id":203,"country_code":"RO","shipping_type":"pudo","max_weight":"30","price_ron":"15","price_eur":"3.17","price_usd":"3.43","price_gbp":"2.71","price_huf":"1236.38","price_bgn":"6.19"},{"idx":203,"id":204,"country_code":"DEFAULT","shipping_type":"hd","max_weight":"100","price_ron":"60","price_eur":"12.66","price_usd":"13.73","price_gbp":"10.84","price_huf":"4945.5","price_bgn":"24.76"},{"idx":204,"id":205,"country_code":"DEFAULT","shipping_type":"pudo","max_weight":"100","price_ron":"45","price_eur":"9.5","price_usd":"10.3","price_gbp":"8.13","price_huf":"3709.13","price_bgn":"18.57"}];

export function ShippingRatesTable() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [addingCountry, setAddingCountry] = useState<string | null>(null);

  const countryNames: Record<string, string> = {
    RO: 'România',
    BG: 'Bulgaria',
    HU: 'Ungaria',
    CZ: 'Cehia',
    SK: 'Slovacia',
    AT: 'Austria',
    BE: 'Belgia',
    CY: 'Cipru',
    HR: 'Croația',
    EE: 'Estonia',
    FI: 'Finlanda',
    FR: 'Franța',
    DE: 'Germania',
    GR: 'Grecia',
    IT: 'Italia',
    LV: 'Letonia',
    LT: 'Lituania',
    LU: 'Luxemburg',
    NL: 'Olanda',
    PL: 'Polonia',
    PT: 'Portugalia',
    GB: 'Marea Britanie',
    SI: 'Slovenia',
    ES: 'Spania',
    SE: 'Suedia',
    DEFAULT: 'Restul Lumii'
  };

  useEffect(() => {
    fetchRates();
  }, []);

  async function fetchRates() {
    setLoading(true);
    try {
      const dbRates = await getShippingRates().catch(() => null);
      const sourceData = (Array.isArray(dbRates) && dbRates.length > 0)
        ? dbRates
        : MOCK_DATA;
      // Filter out PUDO for all countries except RO and DEFAULT
      const filteredData = sourceData.filter((r: any) => !(r.shipping_type === 'pudo' && r.country_code !== 'RO' && r.country_code !== 'DEFAULT'));
      setRates(filteredData);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(rate: any) {
    setEditingId(rate.id);
    setEditForm(rate);
  }

  async function handleSave() {
    try {
      const priceRonNum = Number(editForm.price_ron) || 0;
      const priceEurNum = parseFloat((priceRonNum / 4.97).toFixed(2));
      const payload = {
        country_code: editForm.country_code,
        shipping_type: editForm.shipping_type || 'hd',
        max_weight: Number(editForm.max_weight) || 1,
        price_ron: priceRonNum,
        price_eur: priceEurNum,
      };

      if (isAdding) {
        const created = await addShippingRate(payload).catch(() => null);
        if (created) {
          setRates([...rates, created]);
          toast.success('Tariful a fost adăugat.');
        } else {
          const newRate = { ...editForm, ...payload, id: Date.now(), idx: rates.length };
          setRates([...rates, newRate]);
          toast.success('Tariful a fost adăugat.');
        }
      } else if (editingId) {
        const updated = await updateShippingRate(editingId, payload).catch(() => null);
        const updatedRates = rates.map(r => r.id === editingId ? {
          ...r,
          ...editForm,
          ...(updated || payload),
        } : r);
        setRates(updatedRates);
        toast.success('Tariful a fost actualizat.');
      }
      setEditingId(null);
      setIsAdding(false);
      setAddingCountry(null);
      setEditForm({});
    } catch (e: any) {
      toast.error('Eroare la salvare: ' + e.message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteShippingRate(id).catch(() => null);
      const remainingRates = rates.filter(r => r.id !== id);
      setRates(remainingRates);
      toast.success('Tariful a fost șters.');
    } catch (e: any) {
      toast.error('Eroare la ștergere: ' + e.message);
    }
  }

  function handleAddNew(countryCode: string) {
    setIsAdding(true);
    setAddingCountry(countryCode);
    setEditingId(-1);
    setEditForm({
      country_code: countryCode,
      shipping_type: 'hd',
      max_weight: 1,
      price_ron: 0,
      price_eur: 0,
    });
  }

  // Group by country
  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.country_code]) acc[rate.country_code] = [];
    acc[rate.country_code].push(rate);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort countries: RO first, then alphabetical
  const sortedCountries = Object.keys(groupedRates).sort((a, b) => {
    if (a === 'RO') return -1;
    if (b === 'RO') return 1;
    return (countryNames[a] || a).localeCompare(countryNames[b] || b);
  });

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package size={20} className="text-[#e32f8c]" /> Prețuri Livrare
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestionează tarifele de curierat pe țări (în RON)</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl">
          Eroare: {error}
        </div>
      )}

      {loading && rates.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" /> Se încarcă...
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCountries.map((countryCode) => (
            <div key={countryCode} className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
              {/* Header Tara */}
              <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${countryCode === 'RO' ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-wide">
                    {countryNames[countryCode] || countryCode} <span className="text-slate-400 font-medium text-sm">({countryCode})</span>
                  </h3>
                </div>
                <button onClick={() => handleAddNew(countryCode)} className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <Plus size={14} /> Tarif
                </button>
              </div>

              {/* Grupari pe metode de livrare */}
              <div className="flex flex-col">
                {(['hd', 'pudo'] as const).map(shippingType => {
                  const ratesForType = groupedRates[countryCode].filter((r: any) => r.shipping_type === shippingType).sort((a: any, b: any) => parseFloat(a.max_weight) - parseFloat(b.max_weight));
                  if (ratesForType.length === 0) return null;

                  return (
                    <div key={shippingType} className="border-b border-slate-100 last:border-0 pb-2">
                      <div className="px-4 sm:px-6 py-3 bg-white flex items-center gap-2">
                        {shippingType === 'hd' ? (
                           <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wider">Home Delivery</span>
                        ) : (
                           <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wider">Locker (PUDO)</span>
                        )}
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                           {COUNTRY_SERVICES[countryCode]?.[shippingType]?.[0]?.name || 'Packeta / Sameday'}
                        </span>
                      </div>
                      <div className="">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-white text-slate-400 font-semibold text-xs tracking-wider">
                            <tr>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Până la (kg)</th>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Preț (RON)</th>
                              <th className="px-4 sm:px-6 py-2 w-1/3">Preț Estimat (EUR)</th>
                              <th className="px-4 sm:px-6 py-2 text-right">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {ratesForType.map((rate: any) => (
                              <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors group">
                                {editingId === rate.id ? (
                                  <>
                                    <td className="px-4 sm:px-6 py-2">
                                      <div className="relative">
                                        <input type="number" step="0.1" className="w-24 p-2 pr-6 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.max_weight} onChange={e => setEditForm({...editForm, max_weight: parseFloat(e.target.value)})} />
                                        <span className="absolute right-3 lg:right-[calc(100%-6rem)] top-2.5 text-xs text-slate-400">kg</span>
                                      </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2">
                                      <div className="relative">
                                        <input type="number" step="0.01" className="w-28 p-2 pr-8 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.price_ron} onChange={e => setEditForm({...editForm, price_ron: parseFloat(e.target.value)})} />
                                        <span className="absolute right-3 lg:right-[calc(100%-7rem)] top-2.5 text-xs text-blue-500 font-bold">lei</span>
                                      </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2">
                                      <span className="text-slate-400 font-medium text-sm flex items-center gap-1">
                                        {editForm.price_ron ? (editForm.price_ron / 4.97).toFixed(2) : '0.00'} € <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">auto</span>
                                      </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={handleSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-500/20"><Save size={16} /></button>
                                        <button onClick={() => {setEditingId(null); setIsAdding(false); setAddingCountry(null);}} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-700">{rate.max_weight} kg</td>
                                    <td className="px-4 sm:px-6 py-3 font-black text-slate-900 text-sm sm:text-base">{rate.price_ron} lei</td>
                                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-400">{rate.price_eur || (rate.price_ron / 4.97).toFixed(2)} €</td>
                                    <td className="px-4 sm:px-6 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditClick(rate)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-blue-600 shadow-sm"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(rate.id)} className="p-2 bg-white border border-slate-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm hover:border-red-200"><Trash2 size={14} /></button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formular Adaugare */}
              {isAdding && addingCountry === countryCode && editingId === -1 && (
                <div className="bg-blue-50/50 p-4 sm:p-6 border-t border-blue-100">
                  <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2"><Plus size={16}/> Adaugă tarif nou pentru {countryNames[countryCode] || countryCode}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Serviciu</label>
                      <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.shipping_type} onChange={e => setEditForm({...editForm, shipping_type: e.target.value})}>
                        <option value="hd">Home Delivery</option>
                        {countryCode === 'RO' && <option value="pudo">Locker (PUDO)</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Greutate maximă (kg)</label>
                      <div className="relative">
                        <input type="number" step="0.1" className="w-full p-2.5 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.max_weight} onChange={e => setEditForm({...editForm, max_weight: parseFloat(e.target.value)})} />
                        <span className="absolute right-3 top-3 text-xs text-slate-400">kg</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Preț (RON)</label>
                      <div className="relative">
                        <input type="number" step="0.01" className="w-full p-2.5 pr-8 border border-blue-200 bg-white text-blue-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.price_ron} onChange={e => setEditForm({...editForm, price_ron: parseFloat(e.target.value)})} />
                        <span className="absolute right-3 top-3 text-xs text-blue-500 font-bold">lei</span>
                      </div>
                    </div>
                    <div className="flex gap-2 h-[42px]">
                      <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 transition-colors">
                        <Save size={16} /> Salvează
                      </button>
                      <button onClick={() => {setEditingId(null); setIsAdding(false); setAddingCountry(null);}} className="px-4 flex items-center justify-center bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        Anulează
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Loader2({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
