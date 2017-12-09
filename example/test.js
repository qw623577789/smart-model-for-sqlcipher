const SmartModel = require('../');
const Logic = SmartModel.Logic;

SmartModel.setup(`${__dirname}/models`, `${__dirname}/config`);

(async () => {
    try {
        console.log(await SmartModel.insert('user').data({name:'ray', id: '1003'}).run());
        await SmartModel.insert('user_statistic').data({id:'1003', name:'aaa', logins:3, logouts:2}).run();
        await SmartModel.insert('order').data({id:'123232', amount:1000, userId:'1003'}).run();
        

        let counts = await SmartModel.count('user').where(
            Logic.and([
                Logic.statement('name', SmartModel.Ops.LIKE, '%ay%'),
                Logic.statement('id', SmartModel.Ops.EQ, 1003)
            ])
               
        ).run();
        console.log(counts);

        let [row] = await SmartModel.select('user')
            .join('user_statistic', 'left', 'user.id', 'user_statistic.id')
            .join('order', 'left', 'user_statistic.id', 'order.userId')
            .where(
                Logic.statement('user.name', '=', 'ray')
            ).range(0, 20).run();
        console.log(row);
        
        console.log(await SmartModel.update('user').data({name: 'tyson'}).where(Logic.statement('user.name', '=', 'ray') ).run());
        
        console.log(await SmartModel.delete('user').run());
        await SmartModel.delete('user_statistic').run();
        await SmartModel.delete('order').run();        
    }
    catch(err) {
        console.error(err.stack);
    }
})();


