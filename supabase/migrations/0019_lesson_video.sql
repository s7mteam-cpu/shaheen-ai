-- Educational animated video: lesson text → script + voice + animated explainer scenes (edited in the montage studio)
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('lesson-video','claude','فيديو تعليمي متحرك','اكتب الدرس أو الفكرة، وشاهين يسوي فيديو شرح متحرك: رسوم وخطوات ومقارنات ورسوم بيانية، مع صوت بلهجتك وترجمة.','video','film',10,5,'30 ثانية',null,true,5)
on conflict (id) do nothing;
