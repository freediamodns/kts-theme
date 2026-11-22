
<div class="row" id="egg-rules">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Egg Rules <span class="label label-primary">{{ count($rules) }}</span></h3>
                <div class="box-tools">
                    <button type="button" class="btn btn-sm btn-primary er-add">Add</button>
                </div>
            </div>

            <div class="box-body">
                <p class="text-muted small">
                    A server on any egg in <strong>Eggs</strong> sees the switch tab, and may move to any egg in
                    <strong>Allowed eggs</strong>. An egg in several rules is offered all of them, and a server whose
                    egg is in no rule does not get the tab.
                    @if (count($rules) === 0)
                        Until the first rule is added, the two legacy lists above still decide.
                    @endif
                </p>

                <table class="table er-table">
                    <thead>
                        <tr>
                            <th class="er-id">#</th>
                            <th>Eggs</th>
                            <th>Allowed eggs</th>
                            <th class="er-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($rules as $rule)
                            @php($form = 'egg-rule-' . $rule['id'])
                            <tr>
                                <td class="er-id">{{ $loop->iteration }}</td>
                                <td>
                                    @include('admin.dezerx.addons.egg-rules-select', ['form' => $form, 'name' => 'eggs[]', 'selected' => $rule['eggs']])
                                </td>
                                <td>
                                    @include('admin.dezerx.addons.egg-rules-select', ['form' => $form, 'name' => 'allowed[]', 'selected' => $rule['allowed']])
                                </td>
                                <td class="er-actions">
                                    <form id="{{ $form }}" method="POST"
                                          action="{{ route('admin.dezerx.addons.eggrules.update', ['rule' => $rule['id']]) }}">
                                        {!! csrf_field() !!}
                                        <button type="submit" class="btn btn-sm btn-primary">Save</button>
                                        <button type="submit" class="btn btn-sm btn-danger er-delete"
                                                formaction="{{ route('admin.dezerx.addons.eggrules.destroy', ['rule' => $rule['id']]) }}">
                                            Delete
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        @endforeach

                        <tr class="er-none" @if (count($rules) > 0) style="display:none;" @endif>
                            <td colspan="4" class="text-muted">No rules yet. <strong>Add</strong> makes the first one.</td>
                        </tr>
                    </tbody>
                </table>

                <template id="egg-rule-new">
                    <tr>
                        <td class="er-id">{{ count($rules) + 1 }}</td>
                        <td>
                            @include('admin.dezerx.addons.egg-rules-select', ['form' => 'egg-rule-new-form', 'name' => 'eggs[]', 'selected' => []])
                        </td>
                        <td>
                            @include('admin.dezerx.addons.egg-rules-select', ['form' => 'egg-rule-new-form', 'name' => 'allowed[]', 'selected' => []])
                        </td>
                        <td class="er-actions">
                            <form id="egg-rule-new-form" method="POST" action="{{ route('admin.dezerx.addons.eggrules.store') }}">
                                {!! csrf_field() !!}
                                <button type="submit" class="btn btn-sm btn-primary">Save</button>
                                <button type="button" class="btn btn-sm btn-default er-cancel">Cancel</button>
                            </form>
                        </td>
                    </tr>
                </template>
            </div>
        </div>
    </div>
</div>
